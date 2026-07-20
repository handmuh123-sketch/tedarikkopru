"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useHydrated } from "@/lib/react/use-hydrated";

type Option = { id: string; name: string };
type ExistingProduct = {
  id: string;
  categoryId: string;
  brandId: string;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  originCountry: string;
  vatRateBasisPoints: number;
  warrantyMonths: number | null;
  handlingDays: number;
  variant: {
    sku: string;
    barcode: string | null;
    title: string;
    packageQuantity: number;
    moq: number;
    quantityStep: number;
    priceAmountMinor: number;
  };
};

function minorToInput(value: number): string {
  return `${Math.trunc(value / 100)},${String(value % 100).padStart(2, "0")}`;
}

function parsePriceMinor(value: string): number | null {
  const normalized = value.trim().replaceAll(" ", "").replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(result) && result > 0 ? result : null;
}

export function ProductForm({
  organizationId,
  categories,
  brands,
  existing,
}: {
  organizationId: string;
  categories: Option[];
  brands: Option[];
  existing?: ExistingProduct;
}) {
  const hydrated = useHydrated();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const priceAmountMinor = parsePriceMinor(String(form.get("price") ?? ""));
    if (!priceAmountMinor) {
      setMessage("Toptan fiyatı 129,90 biçiminde girin.");
      setBusy(false);
      return;
    }
    const body = {
      categoryId: form.get("categoryId"),
      brandId: form.get("brandId"),
      title: form.get("title"),
      slug: form.get("slug"),
      shortDescription: form.get("shortDescription"),
      description: form.get("description"),
      originCountry: form.get("originCountry"),
      vatRateBasisPoints: Number(form.get("vatRateBasisPoints")),
      warrantyMonths: form.get("warrantyMonths") ? Number(form.get("warrantyMonths")) : null,
      handlingDays: Number(form.get("handlingDays")),
      variant: {
        sku: form.get("sku"),
        barcode: form.get("barcode") || undefined,
        title: form.get("variantTitle"),
        packageQuantity: Number(form.get("packageQuantity")),
        moq: Number(form.get("moq")),
        quantityStep: Number(form.get("quantityStep")),
        priceAmountMinor,
      },
    };
    const path = existing
      ? `/api/v1/organizations/${organizationId}/products/${existing.id}`
      : `/api/v1/organizations/${organizationId}/products`;
    const response = await fetch(path, {
      method: existing ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result?.error?.message ?? "Ürün kaydedilemedi.");
      setBusy(false);
      return;
    }
    router.push("/tedarikci/urunler");
    router.refresh();
  }
  return (
    <form className="auth-form two-column product-form" onSubmit={submit}>
      <label>
        Ürün adı
        <input name="title" required minLength={3} maxLength={180} defaultValue={existing?.title} />
      </label>
      <label>
        URL kısa adı
        <input
          name="slug"
          required
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          defaultValue={existing?.slug}
        />
      </label>
      <label>
        Kategori
        <select name="categoryId" required defaultValue={existing?.categoryId ?? ""}>
          <option value="" disabled>
            Seçin
          </option>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Marka
        <select name="brandId" required defaultValue={existing?.brandId ?? ""}>
          <option value="" disabled>
            Seçin
          </option>
          {brands.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="span-two">
        Kısa açıklama
        <input
          name="shortDescription"
          required
          minLength={10}
          maxLength={320}
          defaultValue={existing?.shortDescription}
        />
      </label>
      <label className="span-two">
        Ürün açıklaması
        <textarea
          name="description"
          required
          minLength={20}
          maxLength={10000}
          defaultValue={existing?.description}
        />
      </label>
      <label>
        SKU
        <input name="sku" required defaultValue={existing?.variant.sku} />
      </label>
      <label>
        Varyant adı
        <input name="variantTitle" required defaultValue={existing?.variant.title ?? "Standart"} />
      </label>
      <label>
        Barkod (isteğe bağlı)
        <input name="barcode" inputMode="numeric" defaultValue={existing?.variant.barcode ?? ""} />
      </label>
      <label>
        Toptan fiyat (TL)
        <input
          name="price"
          required
          inputMode="decimal"
          defaultValue={existing ? minorToInput(existing.variant.priceAmountMinor) : ""}
          placeholder="129,90"
        />
      </label>
      <label>
        Minimum sipariş
        <input
          name="moq"
          required
          type="number"
          min="1"
          defaultValue={existing?.variant.moq ?? 1}
        />
      </label>
      <label>
        Sipariş artış adımı
        <input
          name="quantityStep"
          required
          type="number"
          min="1"
          defaultValue={existing?.variant.quantityStep ?? 1}
        />
      </label>
      <label>
        Paket içi adet
        <input
          name="packageQuantity"
          required
          type="number"
          min="1"
          defaultValue={existing?.variant.packageQuantity ?? 1}
        />
      </label>
      <label>
        Hazırlık süresi (gün)
        <input
          name="handlingDays"
          required
          type="number"
          min="0"
          max="90"
          defaultValue={existing?.handlingDays ?? 2}
        />
      </label>
      <label>
        Menşei ülke kodu
        <input
          name="originCountry"
          required
          pattern="[A-Za-z]{2}"
          defaultValue={existing?.originCountry ?? "TR"}
        />
      </label>
      <label>
        KDV (baz puan)
        <select name="vatRateBasisPoints" defaultValue={existing?.vatRateBasisPoints ?? 2000}>
          <option value="100">%1</option>
          <option value="1000">%10</option>
          <option value="2000">%20</option>
        </select>
      </label>
      <label>
        Garanti (ay)
        <input
          name="warrantyMonths"
          type="number"
          min="0"
          max="240"
          defaultValue={existing?.warrantyMonths ?? 24}
        />
      </label>
      {message && (
        <p className="form-status error span-two" role="alert">
          {message}
        </p>
      )}
      <button className="button button-primary" type="submit" disabled={!hydrated || busy}>
        {busy ? "Kaydediliyor…" : "Ürünü kaydet"}
      </button>
    </form>
  );
}
