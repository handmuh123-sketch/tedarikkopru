import Image from "next/image";
import Link from "next/link";

import { CartItemActions } from "@/components/orders/cart-item-actions";
import { requirePageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";
import { formatTryMinor } from "@/modules/catalog/domain/product-rules";
import {
  cartView,
  getBuyerCart,
  releaseExpiredReservations,
} from "@/modules/orders/application/order-service";

export const dynamic = "force-dynamic";

export default async function CartPage() {
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
  if (!membership) {
    return (
      <main id="ana-icerik" className="dashboard-page">
        <h1>Sepet kullanılamıyor</h1>
        <p>Onaylı alıcı işletmesi ve satın alma yetkisi gerekir.</p>
      </main>
    );
  }
  const cart = cartView(await getBuyerCart(membership.organizationId));
  const minimum = cart.supplier?.minimumOrderAmountMinor ?? 0;
  const minimumMet = cart.subtotalAmountMinor >= minimum;
  return (
    <main id="ana-icerik" className="dashboard-page cart-page" tabIndex={-1}>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">{membership.organization.tradeName}</p>
          <h1>Sepet</h1>
        </div>
        <Link className="button button-secondary" href="/urunler">
          Ürünlere dön
        </Link>
      </header>
      {cart.items.length === 0 ? (
        <section className="dashboard-card">
          <h2>Sepetiniz boş</h2>
          <p>Public katalogdan bir ürün ekleyin.</p>
        </section>
      ) : (
        <>
          <p>
            Tek tedarikçi: <strong>{cart.supplier?.tradeName}</strong>
          </p>
          <section className="cart-list" aria-label="Sepet satırları">
            {cart.items.map((item) => (
              <article className="dashboard-card cart-row" key={item.id}>
                {item.image && <Image src={item.image} alt="" width={96} height={96} />}
                <div>
                  <h2>{item.productTitle}</h2>
                  <p>
                    {item.sku} · {formatTryMinor(item.unitPriceAmountMinor)}
                  </p>
                  <strong>{formatTryMinor(item.subtotalAmountMinor)}</strong>
                </div>
                <CartItemActions
                  organizationId={membership.organizationId}
                  itemId={item.id}
                  initialQuantity={item.quantity}
                  moq={item.moq}
                  quantityStep={item.quantityStep}
                />
              </article>
            ))}
          </section>
          <section className="dashboard-card cart-summary">
            <h2>Sepet özeti</h2>
            <p>
              Ara toplam: <strong>{formatTryMinor(cart.subtotalAmountMinor)}</strong>
            </p>
            <p>Minimum sipariş: {formatTryMinor(minimum)}</p>
            {!minimumMet && (
              <p className="form-status error">Minimum sipariş tutarına henüz ulaşılmadı.</p>
            )}
            {minimumMet && (
              <Link className="button button-primary" href="/panel/checkout">
                Checkout&apos;a geç
              </Link>
            )}
          </section>
        </>
      )}
    </main>
  );
}
