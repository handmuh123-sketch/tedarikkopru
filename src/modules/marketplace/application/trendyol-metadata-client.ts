import "server-only";

import { serverEnvironment } from "@/lib/env/server";

import type { MarketplaceConnectionCredentials } from "../domain/types";

const apiBaseUrls = {
  PRODUCTION: "https://apigw.trendyol.com",
  STAGE: "https://stageapigw.trendyol.com",
} as const;

export type TrendyolMetadataError = {
  code: string;
  message: string;
};

export type TrendyolExternalCategory = {
  externalId: string;
  name: string;
  parentExternalId: string | null;
  isLeaf: boolean;
  isActive: boolean;
};

export type TrendyolExternalBrand = {
  externalId: string;
  name: string;
  isActive: boolean;
};

export type TrendyolExternalAttribute = {
  externalId: string;
  name: string;
  isRequired: boolean;
  allowCustom: boolean;
  isVariant: boolean;
  allowsMultiple: boolean;
  values?: TrendyolExternalAttributeValue[] | undefined;
};

export type TrendyolExternalAttributeValue = {
  externalId: string;
  name: string;
  isActive: boolean;
};

type TrendyolCategoryResponse = {
  categories?: Array<{
    id?: number | string;
    name?: string;
    parentId?: number | string | null;
    subCategories?: unknown[];
  }>;
};

type TrendyolBrandResponse = {
  brands?: Array<{ id?: number | string; name?: string }>;
};

type TrendyolAttributeResponse = {
  categoryAttributes?: Array<{
    attribute?: { id?: number | string; name?: string };
    required?: boolean;
    allowCustom?: boolean;
    varianter?: boolean;
    allowMultipleAttributeValues?: boolean;
  }>;
};

function normalizedText(value: unknown, maximum: number): string | null {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim().slice(0, maximum) || null
    : null;
}

function basicHeaders(credentials: MarketplaceConnectionCredentials): HeadersInit {
  return {
    authorization: `Basic ${Buffer.from(`${credentials.apiKey}:${credentials.apiSecret}`).toString("base64")}`,
    "user-agent": `${credentials.sellerId} - TedarikKopru`,
  };
}

export function normalizeMetadataError(error: unknown): TrendyolMetadataError {
  if (error instanceof Response) {
    if (error.status === 401) {
      return { code: "AUTHENTICATION_FAILED", message: "Trendyol kimlik bilgileri doğrulanamadı." };
    }
    if (error.status === 403) {
      return {
        code: "PROVIDER_FORBIDDEN",
        message: "Trendyol meta verisine erişim yetkilendirilmedi.",
      };
    }
    if (error.status === 429) {
      return { code: "RATE_LIMITED", message: "Trendyol meta veri isteği sınırlandı." };
    }
    if (error.status >= 500) {
      return {
        code: "PROVIDER_TEMPORARY",
        message: "Trendyol meta veri servisi geçici olarak yanıt vermedi.",
      };
    }
  }
  return { code: "METADATA_REQUEST_FAILED", message: "Trendyol meta verisi alınamadı." };
}

export class TrendyolMetadataClient {
  constructor(private readonly credentials: MarketplaceConnectionCredentials | null) {}

  private async get<T>(path: string): Promise<T> {
    if (!serverEnvironment.FEATURE_MARKETPLACE_TRENDYOL || !this.credentials) {
      throw new Error("TRENDYOL_METADATA_PREVIEW_ONLY");
    }
    const response = await fetch(`${apiBaseUrls[this.credentials.environment]}${path}`, {
      headers: basicHeaders(this.credentials),
      cache: "no-store",
    });
    if (!response.ok) throw response;
    return (await response.json()) as T;
  }

  async fetchCategories(): Promise<TrendyolExternalCategory[]> {
    const response = await this.get<TrendyolCategoryResponse>(
      "/integration/product/product-categories",
    );
    return (response.categories ?? []).flatMap((category) => {
      const externalId = normalizedText(category.id, 80);
      const name = normalizedText(category.name, 200);
      if (!externalId || !name) return [];
      return [
        {
          externalId,
          name,
          parentExternalId: normalizedText(category.parentId, 80),
          isLeaf: !category.subCategories?.length,
          isActive: true,
        },
      ];
    });
  }

  async fetchCategoryAttributes(categoryId: string): Promise<TrendyolExternalAttribute[]> {
    const response = await this.get<TrendyolAttributeResponse>(
      `/integration/product/categories/${encodeURIComponent(categoryId)}/attributes`,
    );
    return (response.categoryAttributes ?? []).flatMap((item) => {
      const externalId = normalizedText(item.attribute?.id, 80);
      const name = normalizedText(item.attribute?.name, 200);
      if (!externalId || !name) return [];
      return [
        {
          externalId,
          name,
          isRequired: item.required === true,
          allowCustom: item.allowCustom === true,
          isVariant: item.varianter === true,
          allowsMultiple: item.allowMultipleAttributeValues === true,
        },
      ];
    });
  }

  async searchBrands(query: string): Promise<TrendyolExternalBrand[]> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return [];
    const response = await this.get<
      TrendyolBrandResponse | Array<{ id?: number | string; name?: string }>
    >(`/integration/product/brands/by-name?name=${encodeURIComponent(normalizedQuery)}`);
    const brands = Array.isArray(response) ? response : (response.brands ?? []);
    return brands.flatMap((brand) => {
      const externalId = normalizedText(brand.id, 80);
      const name = normalizedText(brand.name, 200);
      return externalId && name ? [{ externalId, name, isActive: true }] : [];
    });
  }
}
