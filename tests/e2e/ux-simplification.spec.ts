import { expect, test, type Page } from "@playwright/test";

import { demoAdminPassword, demoUserPassword } from "./test-environment";

async function login(page: Page, email: string, password: string) {
  await page.goto("/giris");
  await page.getByLabel("E-posta").fill(email);
  await page.getByLabel("Parola").fill(password);
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(page).toHaveURL(/panel/, { timeout: 60_000 });
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    ),
  ).toBe(false);
}

async function expectWorkspaceNavigation(page: Page, label: string) {
  if (test.info().project.name === "chromium-mobile") {
    await page.getByText("Menü", { exact: true }).click();
    await expect(page.getByRole("navigation", { name: `${label} mobil` })).toBeVisible();
    return;
  }
  await expect(page.getByRole("navigation", { name: label })).toBeVisible();
}

test("alıcı paneli görev odaklı gezinme ve sade katalog akışını sunar", async ({ page }) => {
  await login(page, "alici@demo.tedarikkopru.local", demoUserPassword);

  await expect(page.getByRole("heading", { name: /Merhaba,/ })).toBeVisible();
  const commonActions = page.getByRole("region", { name: "Sık kullanılan işlemler" });
  await expect(commonActions).toBeVisible();
  await expect(commonActions.getByRole("link")).toHaveCount(4);
  await expectWorkspaceNavigation(page, "İşletme menüsü");
  await expect(page.locator('a[href^="/admin"]').first()).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await page.goto("/urunler");
  await expect(page.getByRole("heading", { name: "Ürünleri keşfedin" })).toBeVisible();
  await expect(page.getByText("Arama ve filtreler", { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto("/panel/favoriler");
  await expect(page.getByRole("heading", { name: "Favori ürünlerim" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Pazaryerine aktar" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto("/panel/entegrasyonlar/trendyol/onizleme");
  await expect(page.getByRole("heading", { name: "Ürünleriniz satışa hazır mı?" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Bağlantı ayarlarına git" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto("/onboarding");
  await expect(
    page.getByRole("heading", { name: "İşletmenizi doğrulamaya hazırlayın." }),
  ).toBeVisible();
  await expect(page.getByText("Adım 1 / 4", { exact: true })).toBeVisible();
  await expect(page.getByRole("group", { name: "İşletme bilgileri" })).toBeVisible();
  await expect(page.getByRole("button", { name: "İşletmeyi oluştur" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("tedarikçi ve admin için ayrı çalışma alanları gösterilir", async ({ page }) => {
  await login(page, "tedarikci@demo.tedarikkopru.local", demoUserPassword);
  await page.goto("/tedarikci/urunler");
  await expectWorkspaceNavigation(page, "İşletme menüsü");
  await expect(page.getByRole("link", { name: "Stok" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ürünlerim" })).toBeVisible();
  await expect(page.locator('a[href^="/admin"]').first()).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await login(page, "admin@demo.tedarikkopru.local", demoAdminPassword);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Platform operasyonları" })).toBeVisible();
  await expectWorkspaceNavigation(page, "Platform yönetimi");
  await expect(page.getByRole("link", { name: "Doğrulamalar" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
