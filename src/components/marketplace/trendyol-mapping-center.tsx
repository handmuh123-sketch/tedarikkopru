"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type SourceCategory = { id: string; name: string; path: string };
type SourceBrand = { id: string; name: string };
type ProviderCategory = { externalId: string; name: string; source: string; isLeaf: boolean };
type ProviderBrand = { externalId: string; name: string; source: string };
type ProviderAttribute = {
  externalCategoryId: string;
  externalAttributeId: string;
  name: string;
  isRequired: boolean;
  allowCustom: boolean;
  source: string;
  values: Array<{ externalId: string; name: string; source: string }>;
};
type CategoryMapping = {
  id: string;
  categoryId: string;
  externalCategoryId: string;
  externalCategoryName: string;
  isActive: boolean;
  metadataSource: string;
};
type BrandMapping = {
  brandId: string;
  externalBrandId: string;
  externalBrandName: string;
  isActive: boolean;
  metadataSource: string;
};
type AttributeMapping = {
  categoryMappingId: string;
  sourceAttributeKey: string;
  externalAttributeId: string;
  externalAttributeName: string;
  externalValueId: string | null;
  isActive: boolean;
  metadataSource: string;
};

type Props = {
  categories: SourceCategory[];
  brands: SourceBrand[];
  productAttributeKeys: string[];
  providerCategories: ProviderCategory[];
  providerBrands: ProviderBrand[];
  providerAttributes: ProviderAttribute[];
  categoryMappings: CategoryMapping[];
  brandMappings: BrandMapping[];
  attributeMappings: AttributeMapping[];
};

async function save(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error?.message ?? "Eşleşme kaydedilemedi.");
}

export function TrendyolMappingCenter(props: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [unmappedOnly, setUnmappedOnly] = useState(false);
  const [status, setStatus] = useState("");
  const categoryById = useMemo(
    () => new Map(props.categoryMappings.map((mapping) => [mapping.categoryId, mapping])),
    [props.categoryMappings],
  );
  const brandById = useMemo(
    () => new Map(props.brandMappings.map((mapping) => [mapping.brandId, mapping])),
    [props.brandMappings],
  );
  const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");
  const categoryRows = props.categories.filter((category) => {
    const mapping = categoryById.get(category.id);
    return (
      (!unmappedOnly || !mapping?.isActive) &&
      (!normalizedQuery ||
        `${category.name} ${category.path}`.toLocaleLowerCase("tr-TR").includes(normalizedQuery))
    );
  });
  const brandRows = props.brands.filter((brand) => {
    const mapping = brandById.get(brand.id);
    return (
      (!unmappedOnly || !mapping?.isActive) &&
      (!normalizedQuery || brand.name.toLocaleLowerCase("tr-TR").includes(normalizedQuery))
    );
  });

  async function submitCategory(event: FormEvent<HTMLFormElement>, category: SourceCategory) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const external = props.providerCategories.find(
      (item) => item.externalId === data.get("externalId"),
    );
    if (!external) return setStatus("Önce cache içindeki bir Trendyol kategorisini seçin.");
    try {
      await save("/api/v1/admin/marketplace-mappings/categories", {
        channel: "TRENDYOL",
        sourceId: category.id,
        externalId: external.externalId,
        externalName: external.name,
        isActive: true,
      });
      setStatus(`${category.name} eşleşmesi kaydedildi.`);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Eşleşme kaydedilemedi.");
    }
  }

  async function submitBrand(event: FormEvent<HTMLFormElement>, brand: SourceBrand) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const external = props.providerBrands.find(
      (item) => item.externalId === data.get("externalId"),
    );
    if (!external) return setStatus("Önce cache içindeki bir Trendyol markasını seçin.");
    try {
      await save("/api/v1/admin/marketplace-mappings/brands", {
        channel: "TRENDYOL",
        sourceId: brand.id,
        externalId: external.externalId,
        externalName: external.name,
        isActive: true,
      });
      setStatus(`${brand.name} eşleşmesi kaydedildi.`);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Eşleşme kaydedilemedi.");
    }
  }

  async function disableCategory(mapping: CategoryMapping) {
    const category = props.categories.find((item) => item.id === mapping.categoryId);
    if (!category) return;
    try {
      await save("/api/v1/admin/marketplace-mappings/categories", {
        channel: "TRENDYOL",
        sourceId: category.id,
        externalId: mapping.externalCategoryId,
        externalName: mapping.externalCategoryName,
        isActive: false,
      });
      setStatus(`${category.name} eşleşmesi devre dışı bırakıldı.`);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Eşleşme güncellenemedi.");
    }
  }

  async function disableBrand(mapping: BrandMapping) {
    const brand = props.brands.find((item) => item.id === mapping.brandId);
    if (!brand) return;
    try {
      await save("/api/v1/admin/marketplace-mappings/brands", {
        channel: "TRENDYOL",
        sourceId: brand.id,
        externalId: mapping.externalBrandId,
        externalName: mapping.externalBrandName,
        isActive: false,
      });
      setStatus(`${brand.name} eşleşmesi devre dışı bırakıldı.`);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Eşleşme güncellenemedi.");
    }
  }

  async function submitAttribute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const categoryMappingId = String(data.get("categoryMappingId") ?? "");
    const externalAttributeId = String(data.get("externalAttributeId") ?? "");
    const mapping = props.categoryMappings.find((item) => item.id === categoryMappingId);
    const external = props.providerAttributes.find(
      (item) =>
        item.externalCategoryId === mapping?.externalCategoryId &&
        item.externalAttributeId === externalAttributeId,
    );
    if (!mapping || !external) return setStatus("Kaydedilmiş kategori ve provider özelliği seçin.");
    const externalValueId = String(data.get("externalValueId") ?? "") || undefined;
    try {
      await save("/api/v1/admin/marketplace-mappings/attributes", {
        categoryMappingId,
        sourceAttributeKey: data.get("sourceAttributeKey"),
        externalAttributeId: external.externalAttributeId,
        externalAttributeName: external.name,
        externalValueId,
        isActive: true,
      });
      setStatus("Özellik eşleşmesi kaydedildi.");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Özellik eşleşmesi kaydedilemedi.");
    }
  }

  async function disableAttribute(mapping: AttributeMapping) {
    try {
      await save("/api/v1/admin/marketplace-mappings/attributes", {
        categoryMappingId: mapping.categoryMappingId,
        sourceAttributeKey: mapping.sourceAttributeKey,
        externalAttributeId: mapping.externalAttributeId,
        externalAttributeName: mapping.externalAttributeName,
        externalValueId: mapping.externalValueId ?? undefined,
        isActive: false,
      });
      setStatus(`${mapping.sourceAttributeKey} eşleşmesi devre dışı bırakıldı.`);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Eşleşme güncellenemedi.");
    }
  }

  return (
    <div>
      <section className="dashboard-card">
        <h2>Kaynak ve provider meta verisi</h2>
        <p>
          Provider cache: {props.providerCategories.length} kategori · {props.providerBrands.length}{" "}
          marka · {props.providerAttributes.length} özellik. <strong>MANUAL</strong> veya{" "}
          <strong>MOCK</strong> kaynaklı eşleşmeler canlı aktarımı açmaz.
        </p>
        <label>
          Ara
          <input value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>{" "}
        <label>
          <input
            type="checkbox"
            checked={unmappedOnly}
            onChange={(event) => setUnmappedOnly(event.target.checked)}
          />{" "}
          Yalnız eşleşmemişler
        </label>
        {status ? (
          <p className="form-status" role="status">
            {status}
          </p>
        ) : null}
      </section>
      <section className="dashboard-card">
        <h2>Kategori eşleşmeleri</h2>
        {props.providerCategories.length === 0 ? (
          <p>Önce güvenli provider meta verisi cache’ini yönetsel API ile yükleyin.</p>
        ) : null}
        {categoryRows.map((category) => {
          const mapping = categoryById.get(category.id);
          return (
            <form
              key={category.id}
              className="dashboard-actions"
              onSubmit={(event) => submitCategory(event, category)}
            >
              <span>{category.name}</span>
              <select
                name="externalId"
                defaultValue={mapping?.externalCategoryId ?? ""}
                aria-label={`${category.name} Trendyol kategorisi`}
              >
                <option value="">Trendyol kategorisi seçin</option>
                {props.providerCategories.map((external) => (
                  <option key={external.externalId} value={external.externalId}>
                    {external.name} · {external.externalId} · {external.source}
                  </option>
                ))}
              </select>
              <button className="button button-secondary" type="submit">
                Kaydet
              </button>
              {mapping?.isActive ? (
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => void disableCategory(mapping)}
                >
                  Devre dışı bırak
                </button>
              ) : null}
            </form>
          );
        })}
      </section>
      <section className="dashboard-card">
        <h2>Marka eşleşmeleri</h2>
        {brandRows.map((brand) => {
          const mapping = brandById.get(brand.id);
          return (
            <form
              key={brand.id}
              className="dashboard-actions"
              onSubmit={(event) => submitBrand(event, brand)}
            >
              <span>{brand.name}</span>
              <select
                name="externalId"
                defaultValue={mapping?.externalBrandId ?? ""}
                aria-label={`${brand.name} Trendyol markası`}
              >
                <option value="">Trendyol markası seçin</option>
                {props.providerBrands.map((external) => (
                  <option key={external.externalId} value={external.externalId}>
                    {external.name} · {external.externalId} · {external.source}
                  </option>
                ))}
              </select>
              <button className="button button-secondary" type="submit">
                Kaydet
              </button>
              {mapping?.isActive ? (
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => void disableBrand(mapping)}
                >
                  Devre dışı bırak
                </button>
              ) : null}
            </form>
          );
        })}
      </section>
      <section className="dashboard-card">
        <h2>Zorunlu özellik eşleşmeleri</h2>
        <p>
          Kaynak ürün anahtarı, seçilen Trendyol kategori özelliğine bağlanır. Provider’ın zorunlu
          alanları ayrıca görünür.
        </p>
        <form className="dashboard-actions" onSubmit={submitAttribute}>
          <select name="categoryMappingId" aria-label="Kaynak kategori" defaultValue="">
            <option value="">Kategori eşleşmesi seçin</option>
            {props.categoryMappings
              .filter((item) => item.isActive)
              .map((mapping) => (
                <option key={mapping.id} value={mapping.id}>
                  {mapping.externalCategoryName} · {mapping.metadataSource}
                </option>
              ))}
          </select>
          <select name="sourceAttributeKey" aria-label="Kaynak özellik" defaultValue="">
            <option value="">Kaynak özellik seçin</option>
            {props.productAttributeKeys.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
          <select name="externalAttributeId" aria-label="Trendyol özelliği" defaultValue="">
            <option value="">Trendyol özelliği seçin</option>
            {props.providerAttributes.map((attribute) => (
              <option
                key={`${attribute.externalCategoryId}-${attribute.externalAttributeId}`}
                value={attribute.externalAttributeId}
              >
                {attribute.name} · {attribute.isRequired ? "zorunlu" : "opsiyonel"} ·{" "}
                {attribute.source}
              </option>
            ))}
          </select>
          <select name="externalValueId" aria-label="Trendyol özellik değeri" defaultValue="">
            <option value="">Custom/serbest değer</option>
            {props.providerAttributes.flatMap((attribute) =>
              attribute.values.map((value) => (
                <option
                  key={`${attribute.externalCategoryId}-${attribute.externalAttributeId}-${value.externalId}`}
                  value={value.externalId}
                >
                  {attribute.name}: {value.name} · {value.source}
                </option>
              )),
            )}
          </select>
          <button className="button button-secondary" type="submit">
            Özelliği kaydet
          </button>
        </form>
        {props.attributeMappings.length > 0 ? (
          <ul>
            {props.attributeMappings.map((mapping) => (
              <li key={`${mapping.categoryMappingId}-${mapping.sourceAttributeKey}`}>
                {mapping.sourceAttributeKey} → {mapping.externalAttributeName} ·{" "}
                {mapping.metadataSource}
                {mapping.isActive ? (
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => void disableAttribute(mapping)}
                  >
                    Devre dışı bırak
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
