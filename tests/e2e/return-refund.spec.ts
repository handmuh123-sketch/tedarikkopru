import "dotenv/config";

import { expect, test, type Page } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../src/generated/prisma/client";

function requiredDemoPassword() {
  const password = process.env.DEMO_USER_PASSWORD;
  if (!password) {
    throw new Error("E2E için DEMO_USER_PASSWORD .env içinde tanımlı olmalıdır.");
  }
  return password;
}

function requiredDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("E2E için DATABASE_URL .env içinde tanımlı olmalıdır.");
  return databaseUrl;
}

const demoPassword = requiredDemoPassword();
const database = new PrismaClient({ adapter: new PrismaPg({ connectionString: requiredDatabaseUrl() }) });

test.afterAll(async () => database.$disconnect());

async function login(page: Page, email: string) {
  await page.goto("/giris");
  await page.getByLabel("E-posta").fill(email);
  await page.getByLabel("Parola").fill(demoPassword);
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(page).toHaveURL(/panel/);
}

async function logout(page: Page) {
  await page.goto("/panel");
  await page.getByRole("button", { name: "Çıkış yap" }).click();
  await expect(page).toHaveURL(/giris/);
}

function dateInput(daysFromToday: number): string {
  return new Date(Date.now() + daysFromToday * 86_400_000).toISOString().slice(0, 10);
}

async function createDeliveredOrder(page: Page, trackingNumber: string) {
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
  await logout(page);

  await login(page, "tedarikci@demo.tedarikkopru.local");
  await page.goto(`/tedarikci/siparisler/${checkoutPayload.data.order.id}`);
  const decisionResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/supplier-decision") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Siparişi kabul et" }).click();
  expect((await decisionResponse).status()).toBe(200);
  await page.getByLabel("Kargo firması").fill("Pilot Kargo");
  await page.getByLabel("Takip numarası").fill(trackingNumber);
  await page.getByLabel("Kargoya verilme tarihi").fill(dateInput(-1));
  await page.getByLabel("Tahmini teslim tarihi").fill(dateInput(2));
  const shipmentResponse = page.waitForResponse(
    (response) => response.url().endsWith("/shipment") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Kargoya ver" }).click();
  expect((await shipmentResponse).status()).toBe(201);
  const deliveryResponse = page.waitForResponse(
    (response) => response.url().endsWith("/shipment/deliver") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Teslim edildi olarak işaretle" }).click();
  expect((await deliveryResponse).status()).toBe(200);
  await expect(page.getByText("DELIVERED", { exact: true }).first()).toBeVisible();
  await logout(page);
  return checkoutPayload.data.order;
}

async function openReturn(page: Page, orderId: string, quantity: string) {
  await login(page, "alici@demo.tedarikkopru.local");
  await page.goto(`/panel/siparisler/${orderId}`);
  await expect(page.getByRole("heading", { name: "İade talebi oluştur" })).toBeVisible();
  const item = await database.orderItem.findFirstOrThrow({
    where: { orderId },
    select: { skuSnapshot: true },
  });
  await page.getByLabel(`İade miktarı ${item.skuSnapshot}`).fill(quantity);
  await page.getByLabel("Açıklama", { exact: true }).fill("E2E iade açıklaması.");
  const returnResponse = page.waitForResponse(
    (response) => response.url().endsWith("/returns") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "İade talebi oluştur" }).click();
  const response = await returnResponse;
  expect(response.status()).toBe(201);
  const payload = (await response.json()) as { data: { id: string } };
  await expect(page.getByText("REQUESTED", { exact: true }).first()).toBeVisible();
  await logout(page);
  return payload.data.id;
}

test("alıcı iade açar, tedarikçi kabul/refund ve fiziksel teslim alma sonrası tek stok geri koyma yapar", async ({ page }) => {
  await login(page, "alici@demo.tedarikkopru.local");
  const order = await createDeliveredOrder(page, "RET-E2E-ACCEPTED-001");
  const returnId = await openReturn(page, order.id, "2");

  await login(page, "tedarikci@demo.tedarikkopru.local");
  await page.goto(`/tedarikci/iadeler/${returnId}`);
  const acceptResponse = page.waitForResponse(
    (response) => response.url().endsWith("/decision") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "İadeyi kabul et" }).click();
  const accepted = await acceptResponse;
  expect(accepted.status()).toBe(200);
  const acceptRequest = accepted.request();
  const acceptReplay = await page.evaluate(
    async ({ body, idempotencyKey, url }) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": idempotencyKey },
        body,
      });
      return response.status;
    },
    {
      body: acceptRequest.postData() ?? "{}",
      idempotencyKey: acceptRequest.headers()["idempotency-key"] ?? "",
      url: acceptRequest.url(),
    },
  );
  expect(acceptReplay).toBe(200);
  await expect(page.getByText("ACCEPTED", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("RECORDED", { exact: true })).toBeVisible();
  await logout(page);

  await login(page, "alici@demo.tedarikkopru.local");
  await page.goto(`/panel/siparisler/${order.id}`);
  await expect(page.getByText("ACCEPTED", { exact: true }).last()).toBeVisible();
  await expect(page.getByText(/Refund kaydı:/)).toBeVisible();
  await logout(page);

  await login(page, "tedarikci@demo.tedarikkopru.local");
  await page.goto(`/tedarikci/iadeler/${returnId}`);
  const receiptResponse = page.waitForResponse(
    (response) => response.url().endsWith("/receive") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Ürün geri geldi olarak işaretle" }).click();
  const received = await receiptResponse;
  expect(received.status()).toBe(200);
  const receiptRequest = received.request();
  const receiptReplay = await page.evaluate(
    async ({ body, idempotencyKey, url }) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": idempotencyKey },
        body,
      });
      return response.status;
    },
    {
      body: receiptRequest.postData() ?? "{}",
      idempotencyKey: receiptRequest.headers()["idempotency-key"] ?? "",
      url: receiptRequest.url(),
    },
  );
  expect(receiptReplay).toBe(200);
  await expect(page.getByText("RETURN_RECEIVED", { exact: true }).first()).toBeVisible();
  const returnRequest = await database.returnRequest.findUniqueOrThrow({
    where: { id: returnId },
    include: { items: { include: { orderItem: { select: { sourceVariantId: true } } } } },
  });
  const inventory = await database.inventory.findUniqueOrThrow({
    where: { variantId: returnRequest.items[0]!.orderItem.sourceVariantId },
  });
  expect(
    await database.inventoryMovement.count({
      where: { inventoryId: inventory.id, type: "RETURN_RESTORE", referenceId: returnId },
    }),
  ).toBe(1);
  expect(await database.refund.count({ where: { returnRequestId: returnId } })).toBe(1);
  await logout(page);

  await login(page, "alici@demo.tedarikkopru.local");
  await page.goto(`/panel/siparisler/${order.id}`);
  await expect(page.getByText("RETURN_RECEIVED", { exact: true }).first()).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    ),
  ).toBe(false);
});

test("tedarikçi iade talebini reddettiğinde refund veya stok geri koyma oluşmaz", async ({ page }) => {
  await login(page, "alici@demo.tedarikkopru.local");
  const order = await createDeliveredOrder(page, "RET-E2E-REJECTED-001");
  const returnId = await openReturn(page, order.id, "1");

  await login(page, "tedarikci@demo.tedarikkopru.local");
  await page.goto(`/tedarikci/iadeler/${returnId}`);
  const rejectResponse = page.waitForResponse(
    (response) => response.url().endsWith("/decision") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "İadeyi reddet" }).click();
  expect((await rejectResponse).status()).toBe(200);
  await expect(page.getByText("REJECTED", { exact: true }).first()).toBeVisible();
  const returnRequest = await database.returnRequest.findUniqueOrThrow({
    where: { id: returnId },
    include: { items: { include: { orderItem: { select: { sourceVariantId: true } } } } },
  });
  const inventory = await database.inventory.findUniqueOrThrow({
    where: { variantId: returnRequest.items[0]!.orderItem.sourceVariantId },
  });
  expect(await database.refund.count({ where: { returnRequestId: returnId } })).toBe(0);
  expect(
    await database.inventoryMovement.count({
      where: { inventoryId: inventory.id, type: "RETURN_RESTORE", referenceId: returnId },
    }),
  ).toBe(0);
  await logout(page);

  await login(page, "alici@demo.tedarikkopru.local");
  await page.goto(`/panel/siparisler/${order.id}`);
  await expect(page.getByText("REJECTED", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Henüz refund kaydı yok.")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    ),
  ).toBe(false);
});
