import { expect, test } from "@playwright/test";

import { demoUserPassword } from "./test-environment";

test("alıcı Trendyol bağlantısını test modunda güvenli biçimde yapılandırır", async ({ page }) => {
  await page.goto("/giris");
  await page.getByLabel("E-posta").fill("alici@demo.tedarikkopru.local");
  await page.getByLabel("Parola").fill(demoUserPassword);
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(page).toHaveURL(/panel/, { timeout: 60_000 });

  await page.goto("/panel/entegrasyonlar");
  await expect(page.getByRole("heading", { name: "Pazaryeri entegrasyonları" })).toBeVisible();
  await page.getByLabel("Bağlantı adı").fill("E2E Trendyol Test");
  await page.getByLabel("Satıcı kimliği").fill("e2e-seller-123");
  await page.getByLabel("API anahtarı", { exact: true }).fill("e2e-api-key");
  await page.getByLabel("API secret").fill("e2e-api-secret");
  await page.getByLabel("Webhook API anahtarı").fill("e2e-webhook-key");
  await page.getByRole("button", { name: /Bağlantıyı (yapılandır|güncelle)/ }).click();
  await expect(
    page.getByText("Bağlantı güvenli biçimde kaydedildi. Secret değerler tekrar gösterilmez."),
  ).toBeVisible();
  await expect(page.getByText("Credential: Yapılandırıldı")).toBeVisible();
  await expect(page.getByText("e2e-api-secret")).toHaveCount(0);

  await page.getByRole("button", { name: "Bağlantıyı test et" }).click();
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
