export type LineAmounts = {
  subtotalAmountMinor: number;
  vatAmountMinor: number;
  totalAmountMinor: number;
};

const MAX_DATABASE_INTEGER = 2_000_000_000n;

export function isValidOrderQuantity(quantity: number, moq: number, quantityStep: number): boolean {
  return (
    Number.isInteger(quantity) &&
    Number.isInteger(moq) &&
    Number.isInteger(quantityStep) &&
    quantity >= moq &&
    moq > 0 &&
    quantityStep > 0 &&
    (quantity - moq) % quantityStep === 0
  );
}

function checkedMinor(value: bigint): number {
  if (value < 0n || value > MAX_DATABASE_INTEGER) {
    throw new Error("Para tutarı desteklenen güvenli aralığın dışında.");
  }
  return Number(value);
}

export function calculateLineAmounts(
  unitPriceAmountMinor: number,
  quantity: number,
  vatRateBasisPoints: number,
): LineAmounts {
  if (
    !Number.isInteger(unitPriceAmountMinor) ||
    !Number.isInteger(quantity) ||
    !Number.isInteger(vatRateBasisPoints) ||
    unitPriceAmountMinor < 0 ||
    quantity <= 0 ||
    vatRateBasisPoints < 0 ||
    vatRateBasisPoints > 10_000
  ) {
    throw new Error("Satır tutarı girdileri geçersiz.");
  }
  const subtotal = BigInt(unitPriceAmountMinor) * BigInt(quantity);
  const vat = (subtotal * BigInt(vatRateBasisPoints) + 5_000n) / 10_000n;
  return {
    subtotalAmountMinor: checkedMinor(subtotal),
    vatAmountMinor: checkedMinor(vat),
    totalAmountMinor: checkedMinor(subtotal + vat),
  };
}

export function sumOrderAmounts(lines: readonly LineAmounts[]): LineAmounts {
  const subtotal = lines.reduce((sum, line) => sum + BigInt(line.subtotalAmountMinor), 0n);
  const vat = lines.reduce((sum, line) => sum + BigInt(line.vatAmountMinor), 0n);
  return {
    subtotalAmountMinor: checkedMinor(subtotal),
    vatAmountMinor: checkedMinor(vat),
    totalAmountMinor: checkedMinor(subtotal + vat),
  };
}

export function meetsMinimumOrder(
  subtotalAmountMinor: number,
  minimumOrderAmountMinor: number,
): boolean {
  return (
    Number.isInteger(subtotalAmountMinor) &&
    Number.isInteger(minimumOrderAmountMinor) &&
    minimumOrderAmountMinor >= 0 &&
    subtotalAmountMinor >= minimumOrderAmountMinor
  );
}
