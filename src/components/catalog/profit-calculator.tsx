"use client";

import { useMemo, useState } from "react";

function parseNumber(value: string): number {
  const normalized = value.trim().replaceAll(" ", "").replace(",", ".");
  const result = Number(normalized);
  return Number.isFinite(result) && result >= 0 ? result : 0;
}

function formatTry(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(value);
}

export function ProfitCalculator({ wholesalePriceMinor }: { wholesalePriceMinor: number }) {
  const wholesale = wholesalePriceMinor / 100;
  const [salePrice, setSalePrice] = useState(String(Math.ceil(wholesale * 1.55)));
  const [commissionRate, setCommissionRate] = useState("18");
  const [shippingCost, setShippingCost] = useState("55");
  const [adCost, setAdCost] = useState("20");

  const result = useMemo(() => {
    const sale = parseNumber(salePrice);
    const commission = sale * (parseNumber(commissionRate) / 100);
    const shipping = parseNumber(shippingCost);
    const ads = parseNumber(adCost);
    const contribution = sale - wholesale - commission - shipping - ads;
    const margin = sale > 0 ? (contribution / sale) * 100 : 0;
    const commissionRatio = parseNumber(commissionRate) / 100;
    const denominator = 1 - commissionRatio;
    const breakEven = denominator > 0 ? (wholesale + shipping + ads) / denominator : 0;
    return { sale, commission, shipping, ads, contribution, margin, breakEven };
  }, [salePrice, commissionRate, shippingCost, adCost, wholesale]);

  return (
    <section className="profit-calculator" aria-labelledby="profit-calculator-title">
      <div className="profit-calculator-heading">
        <div>
          <p className="eyebrow">Kârlılık simülatörü</p>
          <h2 id="profit-calculator-title">Bu ürün sana yaklaşık ne bırakır?</h2>
        </div>
        <span className="profit-calculator-cost">Alış {formatTry(wholesale)}</span>
      </div>
      <p className="profit-calculator-lead">
        Satış fiyatını ve kendi kanal maliyetlerini gir. Hesap yalnız operasyon ön tahminidir;
        vergi, KDV mahsuplaşması, iade ve diğer şirket giderlerini içermez.
      </p>

      <div className="profit-calculator-fields">
        <label>
          Hedef satış fiyatı (TL)
          <input
            inputMode="decimal"
            min="0"
            value={salePrice}
            onChange={(event) => setSalePrice(event.target.value)}
          />
        </label>
        <label>
          Pazaryeri komisyonu (%)
          <input
            inputMode="decimal"
            min="0"
            max="99"
            value={commissionRate}
            onChange={(event) => setCommissionRate(event.target.value)}
          />
        </label>
        <label>
          Kargo / operasyon (TL)
          <input
            inputMode="decimal"
            min="0"
            value={shippingCost}
            onChange={(event) => setShippingCost(event.target.value)}
          />
        </label>
        <label>
          Reklam / ek maliyet (TL)
          <input
            inputMode="decimal"
            min="0"
            value={adCost}
            onChange={(event) => setAdCost(event.target.value)}
          />
        </label>
      </div>

      <div className="profit-calculator-result">
        <div className={result.contribution >= 0 ? "profit-positive" : "profit-negative"}>
          <span>Tahmini katkı</span>
          <strong>{formatTry(result.contribution)}</strong>
          <small>{result.margin.toFixed(1)}% satış marjı</small>
        </div>
        <div>
          <span>Komisyon</span>
          <strong>{formatTry(result.commission)}</strong>
          <small>Seçtiğin oran üzerinden</small>
        </div>
        <div>
          <span>Başa baş fiyatı</span>
          <strong>{formatTry(result.breakEven)}</strong>
          <small>Girilen maliyetlerle yaklaşık</small>
        </div>
      </div>
    </section>
  );
}
