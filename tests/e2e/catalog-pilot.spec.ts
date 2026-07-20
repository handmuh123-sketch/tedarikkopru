import { expect, test } from "@playwright/test";

test("tedarikçi ürün oluşturur, admin onaylar ve ürün public görünür", async ({ page }) => {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const title = `E2E Pilot USB-C Kablo ${suffix}`;
  const slug = `e2e-pilot-usb-c-kablo-${suffix}`;

  await page.goto("/giris");
  await page.getByLabel("E-posta").fill("tedarikci@demo.tedarikkopru.local");
  await page.getByLabel("Parola").fill(process.env.DEMO_USER_PASSWORD ?? "Faz1-Isletme-Demo-2026!");
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(page).toHaveURL(/panel/);
  await page.getByRole("link", { name: "Ürünleri yönet" }).click();
  await page.getByRole("link", { name: "Yeni ürün" }).click();
  await page.getByLabel("Ürün adı").fill(title);
  await page.getByLabel("URL kısa adı").fill(slug);
  await page.getByLabel("Kategori").selectOption({ label: "Şarj Kabloları" });
  await page.getByLabel("Marka").selectOption({ label: "KöprüTech" });
  await page.getByLabel("Kısa açıklama").fill("E2E pilotu için dayanıklı hızlı şarj kablosu.");
  await page
    .getByLabel("Ürün açıklaması")
    .fill(
      "Doğrulanmış demo tedarikçinin oluşturduğu, hızlı şarj destekli ve örgülü E2E pilot kablo ürünü.",
    );
  await page.getByLabel("SKU").fill(`E2E-CABLE-${suffix}`);
  await page.getByLabel("Varyant adı").fill("Standart");
  await page.getByLabel("Toptan fiyat (TL)").fill("149,90");
  await page.getByLabel("Minimum sipariş").fill("10");
  await page.getByLabel("Sipariş artış adımı").fill("5");
  await page.getByRole("button", { name: "Ürünü kaydet" }).click();
  await expect(page).toHaveURL(/tedarikci\/urunler$/);
  const supplierCard = page.locator("article").filter({ hasText: title });
  await expect(supplierCard).toBeVisible();
  await page.goto("/tedarikci/stok");
  const stockCard = page.locator("article").filter({ hasText: title });
  await stockCard.getByLabel("Stok miktarı").fill("100");
  await stockCard.getByLabel("Güvenlik stoğu").fill("10");
  await stockCard.getByLabel("Değişiklik nedeni").fill("İlk ürün stoğu");
  await stockCard.getByRole("button", { name: "Stoku güncelle" }).click();
  await expect(stockCard.getByText("Stok sunucuda güncellendi.")).toBeVisible();
  await page.goto("/tedarikci/urunler");
  const refreshedSupplierCard = page.locator("article").filter({ hasText: title });
  const submitResponsePromise = page.waitForResponse(
    (response) => response.url().endsWith("/submit") && response.request().method() === "POST",
    { timeout: 60_000 },
  );
  await refreshedSupplierCard.getByRole("button", { name: "Onaya gönder" }).click();
  expect((await submitResponsePromise).status()).toBe(200);
  await page.reload();
  await expect(
    page.locator("article").filter({ hasText: title }).getByText("PENDING_REVIEW"),
  ).toBeVisible();

  await page.goto("/panel");
  await page.getByRole("button", { name: "Çıkış yap" }).click();
  await page.goto("/giris");
  await page.getByLabel("E-posta").fill("admin@demo.tedarikkopru.local");
  await page.getByLabel("Parola").fill(process.env.DEMO_ADMIN_PASSWORD ?? "Faz1-Admin-Demo-2026!");
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await page.getByRole("link", { name: "Ürün moderasyonu" }).click();
  const moderationCard = page.locator("article").filter({ hasText: title });
  await expect(moderationCard).toBeVisible();
  const moderationResponsePromise = page.waitForResponse(
    (response) => response.url().endsWith("/moderate") && response.request().method() === "POST",
    { timeout: 60_000 },
  );
  await moderationCard.getByRole("button", { name: "Onayla ve yayınla" }).click();
  expect((await moderationResponsePromise).status()).toBe(200);
  await page.reload();
  await expect(moderationCard).not.toBeVisible();

  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/urunler");
  const publicLink = page.getByRole("link", { name: new RegExp(title) });
  await expect(publicLink).toBeVisible();
  await publicLink.click();
  await expect(page).toHaveURL(new RegExp(`/urunler/${slug}$`));
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.getByText("149,90 TL")).toBeVisible();
  await expect(page.locator(".product-specs").getByText("10 adet", { exact: true })).toBeVisible();
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});
