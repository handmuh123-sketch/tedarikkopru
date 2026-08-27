import { expect, test } from "@playwright/test";

import { demoAdminPassword, demoUserPassword } from "./test-environment";

test("alıcı Trendyol bağlantısını test modunda güvenli biçimde yapılandırır", async ({ page }) => {
  await page.goto("/giris");
  await page.getByLabel("E-posta").fill("alici@demo.tedarikkopru.local");
  await page.getByLabel("Parola").fill(demoUserPassword);
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(page).toHaveURL(/panel/, { timeout: 60_000 });

  await page.goto("/panel/entegrasyonlar");
  await expect(page.getByRole("heading", { name: "Trendyol bağlantınız" })).toBeVisible();
  await page.getByText("Trendyol’u hazırla", { exact: true }).click();
  await page.getByLabel("Bağlantı adı").fill("E2E Trendyol Test");
  await page.getByLabel("Satıcı kimliği").fill("e2e-seller-123");
  await page.getByLabel("API anahtarı", { exact: true }).fill("e2e-api-key");
  await page.getByLabel("API secret").fill("e2e-api-secret");
  await page.getByLabel("Webhook API anahtarı").fill("e2e-webhook-key");
  await page.getByRole("button", { name: /Bağlantıyı (yapılandır|güncelle)/ }).click();
  await expect(
    page.getByText("Bağlantı güvenli biçimde kaydedildi. Secret değerler tekrar gösterilmez."),
  ).toBeVisible();
  await expect(page.getByText("Test modu", { exact: true })).toBeVisible();
  await expect(page.getByText("e2e-api-secret")).toHaveCount(0);

  const testResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes("/marketplace-connections/") &&
      response.url().endsWith("/test"),
  );
  await page.getByRole("button", { name: "Bağlantıyı test et" }).click();
  expect((await testResponse).status()).toBe(200);
  await expect(
    page.getByText("Test modu doğrulandı; gerçek Trendyol çağrısı yapılmadı."),
  ).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("button", { name: "Trendyol’a aktar" })).toBeDisabled();
  await expect(
    page.getByText("Canlı bağlantı henüz etkin değil. Test modu — gerçek gönderim yapılmaz."),
  ).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("alıcı kartlı Trendyol önizlemesini görür; admin eşleştirme merkezine erişir", async ({
  page,
}) => {
  await page.goto("/giris");
  await page.getByLabel("E-posta").fill("alici@demo.tedarikkopru.local");
  await page.getByLabel("Parola").fill(demoUserPassword);
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(page).toHaveURL(/panel/, { timeout: 60_000 });

  await page.goto("/panel/favoriler");
  await expect(page.getByRole("heading", { name: "Favori ürünlerim" })).toBeVisible();
  await expect(page.getByText("60W Örgülü USB-C Kablo")).toBeVisible();
  await page.getByRole("link", { name: "Pazaryerine aktar" }).click();
  await page.getByRole("link", { name: "Ürün önizlemesini aç" }).click();
  await expect(page.getByRole("heading", { name: "Ürünleriniz satışa hazır mı?" })).toBeVisible();
  await expect(page.getByText("Bluetooth TWS Kablosuz Kulaklık")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    ),
  ).toBe(false);

  await page.goto("/giris");
  await page.getByLabel("E-posta").fill("admin@demo.tedarikkopru.local");
  await page.getByLabel("Parola").fill(demoAdminPassword);
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(page).toHaveURL(/panel/, { timeout: 60_000 });
  await page.goto("/admin/entegrasyonlar/trendyol");
  await expect(page.getByRole("heading", { name: "Trendyol eşleştirme merkezi" })).toBeVisible();
});
