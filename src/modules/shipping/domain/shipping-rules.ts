import type { OrderStatus, ShipmentStatus } from "@/generated/prisma/enums";

export type ShipmentTransitionResult = "APPLY" | "REPLAY" | "CONFLICT";

export function shipmentCreateResult(orderStatus: OrderStatus): ShipmentTransitionResult {
  return orderStatus === "ACCEPTED" ? "APPLY" : "CONFLICT";
}

export function shipmentDeliveryResult(
  orderStatus: OrderStatus,
  shipmentStatus: ShipmentStatus,
): ShipmentTransitionResult {
  if (orderStatus === "DELIVERED" && shipmentStatus === "DELIVERED") return "REPLAY";
  if (orderStatus === "SHIPPED" && shipmentStatus === "SHIPPED") return "APPLY";
  return "CONFLICT";
}
