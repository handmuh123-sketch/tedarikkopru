import "dotenv/config";

import { expect, test, type Page } from "@playwright/test";

function requiredEnvironment(name: "DEMO_USER_PASSWORD" | "DEMO_ADMIN_PASSWORD") {
  const value = process.env[name];
  if (!value) throw new Error(`E2E için ${name} .env içinde tanımlı olmalıdır.`);
  return value;
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/giris");
  await page.getByLabel("E-posta").fill(email);
  await page.getByLabel("Parola").fill(password);
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(page).toHaveURL(/panel/);
}

async function logout(page: Page) {
  await page.goto("/panel");
  await page.getByRole("button", { name: "Çıkış yap" }).click();
  await expect(page).toHaveURL(/giris/);
}

test("alıcı banka transferi bildirir, admin tek onayla siparişi PAID yapar", async ({ page }) => {
  await login(page, "alici@demo.tedarikkopru.local", requiredEnvironment("DEMO_USER_PASSWORD"));
  await page.goto("/urunler/20w-usb-c-hizli-sarj-adaptoru");
  await page.getByLabel("Miktar", { exact: true }).fill("6");
  await page.getByRole("button", { name: "Sepete ekle" }).click();
  await page.getByRole("link", { name: "Sepete git" }).click();
  await page.getByRole("link", { name: "Checkout'a geç" }).click();
  await page.getByRole("button", { name: "Checkout taslağı oluştur" }).click();
  await page.getByRole("link", { name: "Sipariş ve ödeme detayına git" }).click();
  const start = page.waitForResponse((response) => response.url().endsWith("/payments/bank-transfer"));
  await page.getByRole("button", { name: "Banka transferi bildirimi oluştur" }).click();
  expect((await start).status()).toBe(201);
  await expect(page.getByText("Transfer bildirimi alındı; operasyon onayı bekleniyor.")).toBeVisible();
  const orderUrl = page.url();
  await logout(page);

  await login(page, "admin@demo.tedarikkopru.local", requiredEnvironment("DEMO_ADMIN_PASSWORD"));
  await page.goto("/admin/odemeler");
  await page.getByRole("link", { name: "Ödeme detayını aç" }).first().click();
  const approve = page.waitForResponse((response) => response.url().includes("/bank-transfer-decision"));
  await page.getByRole("button", { name: "Transferi onayla" }).click();
  expect((await approve).status()).toBe(200);
  await logout(page);

  await login(page, "alici@demo.tedarikkopru.local", requiredEnvironment("DEMO_USER_PASSWORD"));
  await page.goto(orderUrl);
  await expect(page.getByText("PAID", { exact: true }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});
