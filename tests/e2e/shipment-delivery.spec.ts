import { expect, test, type Page } from "@playwright/test";
import { demoUserPassword } from "./test-environment";

async function login(page: Page, email: string) {
  await page.goto("/giris");
  await page.getByLabel("E-posta").fill(email);
  await page.getByLabel("Parola").fill(demoUserPassword);
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(page).toHaveURL(/panel/);
}

async function logout(page: Page) {
  await page.goto("/panel");
  await page.getByRole("button", { name: "Çıkış yap" }).click();
  await expect(page).toHaveURL(/giris/);
}

async function createPaidOrder(page: Page) {
  await page.goto("/urunler/20w-usb-c-hizli-sarj-adaptoru");
  await page.getByLabel("Miktar", { exact: true }).fill("6");
  const addResponse = page.waitForResponse(
    (response) => response.url().endsWith("/cart") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Sepete ekle" }).click();
  expect((await addResponse).status()).toBe(201);
  await page.getByRole("link", { name: "Sepete git" }).click();
  await page.getByRole("link", { name: "Checkout'a geç" }).click();
  const checkoutResponse = page.waitForResponse(
    (response) => response.url().endsWith("/checkout") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Checkout taslağı oluştur" }).click();
  const checkoutPayload = (await (await checkoutResponse).json()) as {
    data: { order: { id: string; publicNumber: string } };
  };
  await page.getByRole("link", { name: "Sipariş ve ödeme detayına git" }).click();
  const startResponse = page.waitForResponse(
    (response) => response.url().endsWith("/payments/mock") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Mock ödemeyi başlat" }).click();
  expect((await startResponse).status()).toBe(201);
  const completeResponse = page.waitForResponse(
    (response) => response.url().endsWith("/complete") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Ödemeyi başarılı tamamla" }).click();
  expect((await completeResponse).status()).toBe(200);
  await expect(page.getByText("PAID", { exact: true }).first()).toBeVisible();
  return checkoutPayload.data.order;
}

function dateInput(daysFromToday: number): string {
  return new Date(Date.now() + daysFromToday * 86_400_000).toISOString().slice(0, 10);
}

test("tedarikçi siparişi kargoya verir, teslim eder ve alıcı güncel durumu görür", async ({ page }) => {
  await login(page, "alici@demo.tedarikkopru.local");
  const order = await createPaidOrder(page);
  await logout(page);

  await login(page, "tedarikci@demo.tedarikkopru.local");
  await page.goto(`/tedarikci/siparisler/${order.id}`);
  const decisionResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/supplier-decision") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Siparişi kabul et" }).click();
  expect((await decisionResponse).status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Kargoya ver" })).toBeVisible();
  await page.getByLabel("Kargo firması").fill("Pilot Kargo");
  await page.getByLabel("Takip numarası").fill("PK-E2E-2026-001");
  await page.getByLabel("Kargoya verilme tarihi").fill(dateInput(-1));
  await page.getByLabel("Tahmini teslim tarihi").fill(dateInput(2));
  const shipmentResponse = page.waitForResponse(
    (response) => response.url().endsWith("/shipment") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Kargoya ver" }).click();
  const shipment = await shipmentResponse;
  expect(shipment.status()).toBe(201);
  const shipmentRequest = shipment.request();
  const shippingReplay = await page.evaluate(
    async ({ body, idempotencyKey, url }) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": idempotencyKey },
        body,
      });
      return response.status;
    },
    {
      body: shipmentRequest.postData() ?? "{}",
      idempotencyKey: shipmentRequest.headers()["idempotency-key"] ?? "",
      url: shipmentRequest.url(),
    },
  );
  expect(shippingReplay).toBe(201);
  await expect(page.getByText("SHIPPED", { exact: true }).first()).toBeVisible();
  await logout(page);

  await login(page, "alici@demo.tedarikkopru.local");
  await page.goto(`/panel/siparisler/${order.id}`);
  await expect(page.getByRole("heading", { name: "Kargo bilgileri" })).toBeVisible();
  await expect(page.getByText("Kargo firması: Pilot Kargo", { exact: true })).toBeVisible();
  await expect(page.getByText("Takip numarası: PK-E2E-2026-001", { exact: true })).toBeVisible();
  await expect(page.getByText("SHIPPED", { exact: true }).first()).toBeVisible();
  await logout(page);

  await login(page, "tedarikci@demo.tedarikkopru.local");
  await page.goto(`/tedarikci/siparisler/${order.id}`);
  const deliveryResponse = page.waitForResponse(
    (response) => response.url().endsWith("/shipment/deliver") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Teslim edildi olarak işaretle" }).click();
  const delivery = await deliveryResponse;
  expect(delivery.status()).toBe(200);
  const deliveryRequest = delivery.request();
  const deliveryReplay = await page.evaluate(
    async ({ body, idempotencyKey, url }) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": idempotencyKey },
        body,
      });
      return response.status;
    },
    {
      body: deliveryRequest.postData() ?? "{}",
      idempotencyKey: deliveryRequest.headers()["idempotency-key"] ?? "",
      url: deliveryRequest.url(),
    },
  );
  expect(deliveryReplay).toBe(200);
  await expect(page.getByText("DELIVERED", { exact: true }).first()).toBeVisible();
  await logout(page);

  await login(page, "alici@demo.tedarikkopru.local");
  await page.goto(`/panel/siparisler/${order.id}`);
  await expect(page.getByText("DELIVERED", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Siparişiniz teslim edildi.")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    ),
  ).toBe(false);
});
