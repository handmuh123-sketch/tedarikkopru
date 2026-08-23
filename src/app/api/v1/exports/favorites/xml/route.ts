import { requireUser } from "@/lib/auth/access";
import { database } from "@/lib/db/client";
import { errorResponse } from "@/lib/http/errors";
import { availableStock } from "@/modules/inventory/domain/inventory-rules";

function xmlEscape(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET(request: Request) {
  try {
    const { user } = await requireUser(request);
    const favorites = await database.productFavorite.findMany({
      where: {
        userId: user.id,
        product: {
          status: "ACTIVE",
          supplierOrganization: { status: "ACTIVE", verificationStatus: "APPROVED" },
          variants: {
            some: {
              status: "ACTIVE",
              inventory: { is: { onHand: { gt: 0 } } },
            },
          },
        },
      },
      include: {
        product: {
          include: {
            brand: true,
            category: true,
            supplierOrganization: true,
            variants: {
              where: { status: "ACTIVE" },
              include: { inventory: true },
              orderBy: { createdAt: "asc" },
            },
            images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const productsXml = favorites
      .map(({ product }) => {
        const variantsXml = product.variants
          .filter((variant) => {
            const inventory = variant.inventory;
            return (
              inventory &&
              availableStock(inventory.onHand, inventory.safetyStock, inventory.reserved) > 0
            );
          })
          .map((variant) => {
            const inventory = variant.inventory!;
            const stock = availableStock(
              inventory.onHand,
              inventory.safetyStock,
              inventory.reserved,
            );
            return [
              "      <Variant>",
              `        <SKU>${xmlEscape(variant.sku)}</SKU>`,
              `        <Barcode>${xmlEscape(variant.barcode)}</Barcode>`,
              `        <Title>${xmlEscape(variant.title)}</Title>`,
              `        <PriceMinor>${xmlEscape(variant.priceAmountMinor)}</PriceMinor>`,
              `        <Currency>${xmlEscape(variant.currency)}</Currency>`,
              `        <MOQ>${xmlEscape(variant.moq)}</MOQ>`,
              `        <QuantityStep>${xmlEscape(variant.quantityStep)}</QuantityStep>`,
              `        <AvailableStock>${xmlEscape(stock)}</AvailableStock>`,
              "      </Variant>",
            ].join("\n");
          })
          .join("\n");

        const imagesXml = product.images
          .map(
            (image) =>
              `      <Image primary="${image.isPrimary ? "true" : "false"}">${xmlEscape(image.storageKey)}</Image>`,
          )
          .join("\n");

        return [
          "  <Product>",
          `    <Id>${xmlEscape(product.id)}</Id>`,
          `    <Title>${xmlEscape(product.title)}</Title>`,
          `    <Slug>${xmlEscape(product.slug)}</Slug>`,
          `    <Description>${xmlEscape(product.description)}</Description>`,
          `    <ShortDescription>${xmlEscape(product.shortDescription)}</ShortDescription>`,
          `    <Brand>${xmlEscape(product.brand.name)}</Brand>`,
          `    <Category>${xmlEscape(product.category.name)}</Category>`,
          `    <Supplier>${xmlEscape(product.supplierOrganization.tradeName)}</Supplier>`,
          `    <VatRateBasisPoints>${xmlEscape(product.vatRateBasisPoints)}</VatRateBasisPoints>`,
          "    <Images>",
          imagesXml,
          "    </Images>",
          "    <Variants>",
          variantsXml,
          "    </Variants>",
          "  </Product>",
        ].join("\n");
      })
      .join("\n");

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<TedarikKopruExport generatedAt="${new Date().toISOString()}">`,
      productsXml,
      "</TedarikKopruExport>",
      "",
    ].join("\n");

    const date = new Date().toISOString().slice(0, 10);
    return new Response(xml, {
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "content-disposition": `attachment; filename="tedarikkopru-secili-urunler-${date}.xml"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
