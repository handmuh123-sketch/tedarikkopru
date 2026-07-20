import Link from "next/link";

import { CheckoutDraftForm } from "@/components/orders/checkout-draft-form";
import { requirePageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";
import { formatTryMinor } from "@/modules/catalog/domain/product-rules";
import {
  cartView,
  getBuyerCart,
  releaseExpiredReservations,
} from "@/modules/orders/application/order-service";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const { user } = await requirePageUser();
  await releaseExpiredReservations();
  const membership = await database.organizationMembership.findFirst({
    where: {
      userId: user.id,
      status: "ACTIVE",
      role: { in: ["OWNER", "ORG_ADMIN", "ORDER_MANAGER"] },
      organization: {
        type: { in: ["RESELLER", "BOTH"] },
        status: "ACTIVE",
        verificationStatus: "APPROVED",
      },
    },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });
  if (!membership)
    return (
      <main id="ana-icerik" className="dashboard-page">
        <h1>Checkout kullanılamıyor</h1>
      </main>
    );
  const [cartRecord, addresses] = await Promise.all([
    getBuyerCart(membership.organizationId),
    database.address.findMany({
      where: { organizationId: membership.organizationId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    }),
  ]);
  const cart = cartView(cartRecord);
  const deliveryAddresses = addresses.filter((address) =>
    ["HEADQUARTERS", "WAREHOUSE"].includes(address.type),
  );
  const invoiceAddresses = addresses.filter((address) =>
    ["HEADQUARTERS", "BILLING"].includes(address.type),
  );
  const minimumMet = cart.subtotalAmountMinor >= (cart.supplier?.minimumOrderAmountMinor ?? 0);
  return (
    <main id="ana-icerik" className="dashboard-page checkout-page" tabIndex={-1}>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Sipariş taslağı</p>
          <h1>Checkout</h1>
        </div>
        <Link className="button button-secondary" href="/panel/sepet">
          Sepete dön
        </Link>
      </header>
      <section className="dashboard-card">
        <h2>{cart.supplier?.tradeName ?? "Sepet boş"}</h2>
        <p>
          {cart.items.length} satır · Ara toplam{" "}
          <strong>{formatTryMinor(cart.subtotalAmountMinor)}</strong>
        </p>
      </section>
      {cart.items.length > 0 &&
      minimumMet &&
      deliveryAddresses.length > 0 &&
      invoiceAddresses.length > 0 ? (
        <section className="dashboard-card">
          <CheckoutDraftForm
            organizationId={membership.organizationId}
            deliveryAddresses={deliveryAddresses}
            invoiceAddresses={invoiceAddresses}
          />
        </section>
      ) : (
        <p className="form-status error">
          Sepet, minimum tutar veya gerekli teslimat/fatura adresleri eksik.
        </p>
      )}
    </main>
  );
}
