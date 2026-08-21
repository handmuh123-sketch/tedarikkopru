import { expect, test, type Page } from "@playwright/test";

import { demoAdminPassword } from "./test-environment";

async function login(page: Page) {
  await page.goto("/giris");
  await page.getByLabel("E-posta").fill("admin@demo.tedarikkopru.local");
  await page.getByLabel("Parola").fill(demoAdminPassword);
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(page).toHaveURL(/panel/);
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    ),
  ).toBe(false);
}

test("platform admin operasyon yüzeylerinde erişilebilir gezinir", async ({ page }) => {
  await login(page);
  await page.goto("/admin/operasyonlar");
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Sipariş ve iade operasyonları" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Platform yönetimi" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ödemeler" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("link", { name: "Doğrulamalar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Şirket doğrulama kuyruğu" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("link", { name: "Ürünler" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Ürün moderasyonu" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("link", { name: "Importlar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Import işleri" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
