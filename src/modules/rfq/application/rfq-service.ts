import "server-only";

import { createHash } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";
import { database } from "@/lib/db/client";
import { HttpError } from "@/lib/http/errors";
import { buildAuditLogData } from "@/modules/audit/audit-service";
import {
  isValidRfqQuantity,
  rfqQuoteDecisionResult,
  rfqQuoteOfferResult,
  type RfqQuoteDecision,
} from "@/modules/rfq/domain/rfq-rules";

type RequestEvidence = {
  actorUserId: string;
  requestId: string;
  network?: string;
};

type CreateRfqInput = RequestEvidence & {
  buyerOrganizationId: string;
  variantId: string;
  targetQuantity: number;
  buyerNote?: string;
};

type OfferQuoteInput = RequestEvidence & {
  supplierOrganizationId: string;
  rfqId: string;
  unitPriceAmountMinor: number;
  validUntil: Date;
  supplierNote?: string;
  idempotencyKey: string;
  now?: Date;
};

type DecideQuoteInput = RequestEvidence & {
  buyerOrganizationId: string;
  rfqId: string;
  quoteId: string;
  decision: RfqQuoteDecision;
  idempotencyKey: string;
  now?: Date;
};

const quoteSelect = {
  id: true,
  rfqId: true,
  status: true,
  unitPriceAmountMinor: true,
  currency: true,
  validUntil: true,
} satisfies Prisma.QuoteSelect;

type QuoteResult = Prisma.QuoteGetPayload<{ select: typeof quoteSelect }>;

function requestHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function quoteOfferConflict(status: string): HttpError {
  return new HttpError(
    409,
    `Teklif talebi ${status} durumundayken teklif verilemez.`,
    "INVALID_RFQ_QUOTE_TRANSITION",
  );
}

function quoteDecisionConflict(status: string): HttpError {
  return new HttpError(
    409,
    `Teklif ${status} durumundayken alıcı kararı verilemez.`,
    "INVALID_QUOTE_DECISION_TRANSITION",
  );
}

function idempotencyConflict(): HttpError {
  return new HttpError(
    409,
    "Bu idempotency anahtarı farklı bir istek için kullanılmış.",
    "IDEMPOTENCY_CONFLICT",
  );
}

async function findQuoteForOfferIdempotency(
  transaction: Prisma.TransactionClient,
  supplierOrganizationId: string,
  idempotencyKey: string,
  hash: string,
): Promise<QuoteResult | null> {
  const existing = await transaction.quote.findUnique({
    where: {
      supplierOrganizationId_idempotencyKey: { supplierOrganizationId, idempotencyKey },
    },
    select: { ...quoteSelect, requestHash: true },
  });
  if (!existing) return null;
  if (existing.requestHash !== hash) throw idempotencyConflict();
  return {
    id: existing.id,
    rfqId: existing.rfqId,
    status: existing.status,
    unitPriceAmountMinor: existing.unitPriceAmountMinor,
    currency: existing.currency,
    validUntil: existing.validUntil,
  };
}

export async function createRfq(input: CreateRfqInput) {
  return database.$transaction(async (transaction) => {
    const buyerOrganization = await transaction.organization.findFirst({
      where: {
        id: input.buyerOrganizationId,
        type: { in: ["RESELLER", "BOTH"] },
        status: "ACTIVE",
        verificationStatus: "APPROVED",
      },
      select: { id: true },
    });
    if (!buyerOrganization) {
      throw new HttpError(
        422,
        "Teklif talebi için etkin bir alıcı organizasyonu gerekli.",
        "BUYER_ORGANIZATION_INVALID",
      );
    }

    const variant = await transaction.productVariant.findFirst({
      where: {
        id: input.variantId,
        status: "ACTIVE",
        product: {
          status: "ACTIVE",
          supplierOrganization: { status: "ACTIVE", verificationStatus: "APPROVED" },
        },
      },
      select: {
        id: true,
        productId: true,
        supplierOrganizationId: true,
        moq: true,
        quantityStep: true,
      },
    });
    if (!variant) throw new HttpError(404, "Ürün varyantı bulunamadı.", "VARIANT_NOT_FOUND");
    if (!isValidRfqQuantity(input.targetQuantity, variant.moq, variant.quantityStep)) {
      throw new HttpError(
        422,
        `Talep miktarı en az ${variant.moq} olmalı ve ${variant.quantityStep} artışına uymalıdır.`,
        "INVALID_RFQ_QUANTITY",
      );
    }

    const rfq = await transaction.requestForQuote.create({
      data: {
        buyerOrganizationId: buyerOrganization.id,
        supplierOrganizationId: variant.supplierOrganizationId,
        productId: variant.productId,
        variantId: variant.id,
        status: "OPEN",
        targetQuantity: input.targetQuantity,
        buyerNote: input.buyerNote ?? null,
        statusHistory: {
          create: {
            toStatus: "OPEN",
            reasonCode: "rfq_created",
            actorType: "USER",
            actorId: input.actorUserId,
            metadata: { targetQuantity: input.targetQuantity, variantId: variant.id },
          },
        },
      },
      select: { id: true, status: true, targetQuantity: true, variantId: true },
    });
    await transaction.auditLog.create({
      data: buildAuditLogData({
        actorId: input.actorUserId,
        organizationId: buyerOrganization.id,
        action: "rfq.created",
        targetType: "RequestForQuote",
        targetId: rfq.id,
        after: { status: rfq.status, targetQuantity: rfq.targetQuantity, variantId: rfq.variantId },
        requestId: input.requestId,
        ...(input.network ? { network: input.network } : {}),
      }),
    });
    return rfq;
  });
}

export async function offerQuote(input: OfferQuoteInput): Promise<QuoteResult> {
  const now = input.now ?? new Date();
  if (input.validUntil <= now) {
    throw new HttpError(422, "Teklif geçerlilik tarihi gelecekte olmalıdır.", "INVALID_QUOTE_VALIDITY");
  }
  const hash = requestHash({
    rfqId: input.rfqId,
    unitPriceAmountMinor: input.unitPriceAmountMinor,
    validUntil: input.validUntil.toISOString(),
    supplierNote: input.supplierNote,
  });

  try {
    return await database.$transaction(
      async (transaction) => {
        const replay = await findQuoteForOfferIdempotency(
          transaction,
          input.supplierOrganizationId,
          input.idempotencyKey,
          hash,
        );
        if (replay) return replay;

        const rfq = await transaction.requestForQuote.findFirst({
          where: { id: input.rfqId, supplierOrganizationId: input.supplierOrganizationId },
          select: { id: true, status: true },
        });
        if (!rfq) throw new HttpError(404, "Teklif talebi bulunamadı.", "RFQ_NOT_FOUND");

        const existingQuote = await transaction.quote.findUnique({
          where: {
            rfqId_supplierOrganizationId: {
              rfqId: input.rfqId,
              supplierOrganizationId: input.supplierOrganizationId,
            },
          },
          select: { id: true },
        });
        if (existingQuote) {
          throw new HttpError(
            409,
            "Bu teklif talebi için zaten bir teklif verilmiş.",
            "QUOTE_ALREADY_EXISTS",
          );
        }
        if (rfqQuoteOfferResult(rfq.status) === "CONFLICT") throw quoteOfferConflict(rfq.status);

        const claimed = await transaction.requestForQuote.updateMany({
          where: {
            id: rfq.id,
            supplierOrganizationId: input.supplierOrganizationId,
            status: "OPEN",
          },
          data: { status: "QUOTED" },
        });
        if (claimed.count !== 1) {
          const current = await transaction.requestForQuote.findFirst({
            where: { id: rfq.id, supplierOrganizationId: input.supplierOrganizationId },
            select: { status: true },
          });
          if (!current) throw new HttpError(404, "Teklif talebi bulunamadı.", "RFQ_NOT_FOUND");
          throw quoteOfferConflict(current.status);
        }

        const quote = await transaction.quote.create({
          data: {
            rfqId: rfq.id,
            supplierOrganizationId: input.supplierOrganizationId,
            status: "OFFERED",
            unitPriceAmountMinor: input.unitPriceAmountMinor,
            currency: "TRY",
            validUntil: input.validUntil,
            supplierNote: input.supplierNote ?? null,
            idempotencyKey: input.idempotencyKey,
            requestHash: hash,
            statusHistory: {
              create: {
                toStatus: "OFFERED",
                reasonCode: "quote_offered",
                actorType: "USER",
                actorId: input.actorUserId,
                metadata: { unitPriceAmountMinor: input.unitPriceAmountMinor, currency: "TRY" },
              },
            },
          },
          select: quoteSelect,
        });
        await transaction.rfqStatusHistory.create({
          data: {
            rfqId: rfq.id,
            fromStatus: "OPEN",
            toStatus: "QUOTED",
            reasonCode: "supplier_quote_offered",
            actorType: "USER",
            actorId: input.actorUserId,
            metadata: { quoteId: quote.id },
          },
        });
        await transaction.auditLog.create({
          data: buildAuditLogData({
            actorId: input.actorUserId,
            organizationId: input.supplierOrganizationId,
            action: "rfq.quote_offered",
            targetType: "Quote",
            targetId: quote.id,
            after: {
              status: quote.status,
              rfqId: quote.rfqId,
              unitPriceAmountMinor: quote.unitPriceAmountMinor,
              currency: quote.currency,
              validUntil: quote.validUntil.toISOString(),
            },
            requestId: input.requestId,
            ...(input.network ? { network: input.network } : {}),
          }),
        });
        return quote;
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      const replay = await database.quote.findUnique({
        where: {
          supplierOrganizationId_idempotencyKey: {
            supplierOrganizationId: input.supplierOrganizationId,
            idempotencyKey: input.idempotencyKey,
          },
        },
        select: { ...quoteSelect, requestHash: true },
      });
      if (replay) {
        if (replay.requestHash !== hash) throw idempotencyConflict();
        return {
          id: replay.id,
          rfqId: replay.rfqId,
          status: replay.status,
          unitPriceAmountMinor: replay.unitPriceAmountMinor,
          currency: replay.currency,
          validUntil: replay.validUntil,
        };
      }
    }
    throw error;
  }
}

export async function decideQuote(input: DecideQuoteInput): Promise<QuoteResult> {
  const hash = requestHash({ decision: input.decision });
  const now = input.now ?? new Date();

  return database.$transaction(
    async (transaction) => {
      const rfq = await transaction.requestForQuote.findFirst({
        where: { id: input.rfqId, buyerOrganizationId: input.buyerOrganizationId },
        select: { id: true, status: true },
      });
      if (!rfq) throw new HttpError(404, "Teklif talebi bulunamadı.", "RFQ_NOT_FOUND");

      const quote = await transaction.quote.findFirst({
        where: { id: input.quoteId, rfqId: rfq.id, supplierOrganizationId: { not: "" } },
        select: {
          ...quoteSelect,
          decisionIdempotencyKey: true,
          decisionRequestHash: true,
        },
      });
      if (!quote) throw new HttpError(404, "Teklif bulunamadı.", "QUOTE_NOT_FOUND");
      if (quote.decisionIdempotencyKey === input.idempotencyKey) {
        if (quote.decisionRequestHash !== hash) throw idempotencyConflict();
        return {
          id: quote.id,
          rfqId: quote.rfqId,
          status: quote.status,
          unitPriceAmountMinor: quote.unitPriceAmountMinor,
          currency: quote.currency,
          validUntil: quote.validUntil,
        };
      }

      const result = rfqQuoteDecisionResult(rfq.status, quote.status, input.decision);
      if (result === "REPLAY") {
        return {
          id: quote.id,
          rfqId: quote.rfqId,
          status: quote.status,
          unitPriceAmountMinor: quote.unitPriceAmountMinor,
          currency: quote.currency,
          validUntil: quote.validUntil,
        };
      }
      if (result === "CONFLICT") throw quoteDecisionConflict(quote.status);
      if (quote.validUntil <= now) {
        throw new HttpError(409, "Teklifin geçerlilik süresi doldu.", "QUOTE_EXPIRED");
      }

      const claimedQuote = await transaction.quote.updateMany({
        where: { id: quote.id, rfqId: rfq.id, status: "OFFERED" },
        data: {
          status: input.decision,
          decisionIdempotencyKey: input.idempotencyKey,
          decisionRequestHash: hash,
        },
      });
      const claimedRfq = await transaction.requestForQuote.updateMany({
        where: { id: rfq.id, buyerOrganizationId: input.buyerOrganizationId, status: "QUOTED" },
        data: { status: input.decision },
      });
      if (claimedQuote.count !== 1 || claimedRfq.count !== 1) {
        const current = await transaction.quote.findFirst({
          where: { id: quote.id, rfqId: rfq.id },
          select: quoteSelect,
        });
        const currentRfq = await transaction.requestForQuote.findFirst({
          where: { id: rfq.id, buyerOrganizationId: input.buyerOrganizationId },
          select: { status: true },
        });
        if (!current || !currentRfq) throw new HttpError(404, "Teklif bulunamadı.", "QUOTE_NOT_FOUND");
        if (rfqQuoteDecisionResult(currentRfq.status, current.status, input.decision) === "REPLAY") {
          return current;
        }
        throw quoteDecisionConflict(current.status);
      }

      const reasonCode =
        input.decision === "ACCEPTED" ? "buyer_quote_accepted" : "buyer_quote_rejected";
      const action =
        input.decision === "ACCEPTED" ? "rfq.quote_accepted" : "rfq.quote_rejected";
      await transaction.quoteStatusHistory.create({
        data: {
          quoteId: quote.id,
          fromStatus: "OFFERED",
          toStatus: input.decision,
          reasonCode,
          actorType: "USER",
          actorId: input.actorUserId,
          metadata: { rfqId: rfq.id },
        },
      });
      await transaction.rfqStatusHistory.create({
        data: {
          rfqId: rfq.id,
          fromStatus: "QUOTED",
          toStatus: input.decision,
          reasonCode,
          actorType: "USER",
          actorId: input.actorUserId,
          metadata: { quoteId: quote.id },
        },
      });
      await transaction.auditLog.create({
        data: buildAuditLogData({
          actorId: input.actorUserId,
          organizationId: input.buyerOrganizationId,
          action,
          targetType: "Quote",
          targetId: quote.id,
          before: { rfqStatus: "QUOTED", status: "OFFERED" },
          after: { rfqStatus: input.decision, status: input.decision },
          requestId: input.requestId,
          ...(input.network ? { network: input.network } : {}),
        }),
      });
      return {
        id: quote.id,
        rfqId: quote.rfqId,
        status: input.decision,
        unitPriceAmountMinor: quote.unitPriceAmountMinor,
        currency: quote.currency,
        validUntil: quote.validUntil,
      };
    },
    { isolationLevel: "Serializable" },
  );
}
