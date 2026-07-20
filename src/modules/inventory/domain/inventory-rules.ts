export function availableStock(onHand: number, safetyStock: number): number {
  if (!Number.isInteger(onHand) || !Number.isInteger(safetyStock)) {
    throw new Error("Stok değerleri tam sayı olmalıdır.");
  }
  if (onHand < 0 || safetyStock < 0) throw new Error("Stok değerleri negatif olamaz.");
  return Math.max(0, onHand - safetyStock);
}

export function assertInventoryTarget(onHand: number, safetyStock: number): void {
  availableStock(onHand, safetyStock);
  if (onHand > 2_000_000_000 || safetyStock > 2_000_000_000) {
    throw new Error("Stok değeri izin verilen sınırı aşıyor.");
  }
}
