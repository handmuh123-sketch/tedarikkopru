export type SupplierTrustOrder = {
  status: string;
  shipment: {
    status: string;
    shippedAt: Date;
    estimatedDeliveryAt: Date | null;
    deliveredAt: Date | null;
  } | null;
  returnRequests: Array<{ status: string }>;
};

export type SupplierTrustScore = {
  available: boolean;
  score: number | null;
  level: "excellent" | "strong" | "developing" | "insufficient";
  sampleSize: number;
  metrics: {
    acceptanceRate: number | null;
    fulfillmentRate: number | null;
    onTimeDeliveryRate: number | null;
    returnRate: number | null;
  };
  reasons: string[];
};

const operationalStatuses = new Set([
  "PAID",
  "ACCEPTED",
  "SHIPPED",
  "DELIVERED",
  "REJECTED",
  "CANCELLED",
]);

function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

function percent(value: number | null): number | null {
  return value === null ? null : Math.round(value * 1000) / 10;
}

export function calculateSupplierTrust(orders: SupplierTrustOrder[]): SupplierTrustScore {
  const eligible = orders.filter((order) => operationalStatuses.has(order.status));
  const sampleSize = eligible.length;
  const accepted = eligible.filter((order) => !["REJECTED", "CANCELLED"].includes(order.status));
  const fulfilled = eligible.filter((order) => order.shipment !== null || order.status === "DELIVERED");
  const delivered = eligible.filter((order) => order.status === "DELIVERED" || order.shipment?.status === "DELIVERED");
  const timedDeliveries = delivered.filter(
    (order) => order.shipment?.deliveredAt && order.shipment.estimatedDeliveryAt,
  );
  const onTimeDeliveries = timedDeliveries.filter(
    (order) =>
      order.shipment?.deliveredAt &&
      order.shipment.estimatedDeliveryAt &&
      order.shipment.deliveredAt.getTime() <= order.shipment.estimatedDeliveryAt.getTime(),
  );
  const returnedOrders = delivered.filter((order) => order.returnRequests.length > 0);

  const acceptanceRate = ratio(accepted.length, sampleSize);
  const fulfillmentRate = ratio(fulfilled.length, accepted.length);
  const onTimeDeliveryRate = ratio(onTimeDeliveries.length, timedDeliveries.length);
  const returnRate = ratio(returnedOrders.length, delivered.length);

  if (sampleSize < 5) {
    return {
      available: false,
      score: null,
      level: "insufficient",
      sampleSize,
      metrics: {
        acceptanceRate: percent(acceptanceRate),
        fulfillmentRate: percent(fulfillmentRate),
        onTimeDeliveryRate: percent(onTimeDeliveryRate),
        returnRate: percent(returnRate),
      },
      reasons: ["Güven skoru için en az 5 tamamlanmış operasyon gerekir"],
    };
  }

  const acceptancePoints = (acceptanceRate ?? 0) * 35;
  const fulfillmentPoints = (fulfillmentRate ?? 0) * 30;
  const deliveryPoints = (onTimeDeliveryRate ?? 0.75) * 20;
  const returnPoints = (1 - Math.min(returnRate ?? 0, 1)) * 15;
  const score = Math.max(0, Math.min(100, Math.round(acceptancePoints + fulfillmentPoints + deliveryPoints + returnPoints)));
  const reasons: string[] = [];
  if ((acceptanceRate ?? 0) >= 0.95) reasons.push("Yüksek sipariş kabul oranı");
  if ((fulfillmentRate ?? 0) >= 0.9) reasons.push("Güçlü sevkiyat tamamlama oranı");
  if (onTimeDeliveryRate !== null && onTimeDeliveryRate >= 0.9) reasons.push("Zamanında teslimat geçmişi güçlü");
  if (returnRate !== null && returnRate <= 0.05) reasons.push("Düşük iade oranı");
  if (reasons.length === 0) reasons.push("Operasyon geçmişi gelişmeye devam ediyor");

  return {
    available: true,
    score,
    level: score >= 90 ? "excellent" : score >= 75 ? "strong" : "developing",
    sampleSize,
    metrics: {
      acceptanceRate: percent(acceptanceRate),
      fulfillmentRate: percent(fulfillmentRate),
      onTimeDeliveryRate: percent(onTimeDeliveryRate),
      returnRate: percent(returnRate),
    },
    reasons: reasons.slice(0, 3),
  };
}

export function supplierTrustLabel(score: SupplierTrustScore): string {
  if (!score.available) return "Yeterli veri yok";
  if (score.level === "excellent") return "Çok güçlü operasyon geçmişi";
  if (score.level === "strong") return "Güçlü operasyon geçmişi";
  return "Gelişen operasyon geçmişi";
}
