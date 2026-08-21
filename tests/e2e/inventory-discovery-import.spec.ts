import { expect, test } from "@playwright/test";
import { demoUserPassword } from "./test-environment";

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/giris");
  await page.getByLabel("E-posta").fill(email);
  await page.getByLabel("Parola").fill(password);
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(page).toHaveURL(/panel/);
}

test("tedarikçi stoğu günceller; public arama ve filtre kullanılabilir ürünü bulur", async ({
  page,
}) => {
  await login(
    page,
    "tedarikci@demo.tedarikkopru.local",
    demoUserPassword,
  );
  await page.getByRole("link", { name: "Stokları yönet" }).click();
  const stockCard = page.locator("article").filter({ hasText: "60W Örgülü USB-C Kablo" });
  await expect(stockCard).toBeVisible();
  await stockCard.getByLabel("Stok miktarı").fill("155");
  await stockCard.getByLabel("Güvenlik stoğu").fill("15");
  await stockCard.getByLabel("Değişiklik nedeni").fill("E2E pilot sayımı");
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes("/inventory/") && response.request().method() === "PATCH",
  );
  await stockCard.getByRole("button", { name: "Stoku güncelle" }).click();
  expect((await responsePromise).status()).toBe(200);
  await expect(stockCard.getByText("Stok sunucuda güncellendi.")).toBeVisible();

  await page.goto("/urunler");
  await page.getByLabel("Ürün ara").fill("60W");
  await page.getByLabel("Kategori").selectOption({ label: "Şarj Kabloları" });
  await page.getByLabel("Marka").selectOption({ label: "KöprüTech" });
  await page.getByLabel("En düşük fiyat (TL)").fill("80");
  await page.getByLabel("En yüksek fiyat (TL)").fill("100");
  await page.getByRole("button", { name: "Filtrele" }).click();
  await expect(page.getByRole("heading", { name: "60W Örgülü USB-C Kablo" })).toBeVisible();
  await expect(page.getByText("1 kullanılabilir ürün bulundu.")).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});

test("alıcı ürünü favoriler ve kendi favori ekranında görür", async ({ page }) => {
  await login(
    page,
    "alici@demo.tedarikkopru.local",
    demoUserPassword,
  );
  await page.goto("/urunler?q=60W");
  const card = page.locator("article").filter({ hasText: "60W Örgülü USB-C Kablo" });
  await expect(card).toBeVisible();
  const remove = card.getByRole("button", { name: "Favoriden çıkar" });
  if (await remove.isVisible()) await remove.click();
  await card.getByRole("button", { name: "Favoriye ekle" }).click();
  await expect(card.getByText("Favorilere eklendi.")).toBeVisible();
  await page.getByRole("link", { name: "Favorilerim" }).click();
  await expect(page.getByRole("heading", { name: "60W Örgülü USB-C Kablo" })).toBeVisible();
});

test("CSV import önce önizleme ve satır hatası üretir, sonra geçerli satırı uygular", async ({
  page,
}) => {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const sku = `E2E-IMPORT-${suffix}`;
  const title = `E2E Import Kablo ${suffix}`;
  const csv = [
    "supplier_sku,title,brand,category_path,variant_name,description,vat_rate,unit_price,moq,quantity_step,stock,safety_stock,handling_days",
    `${sku},${title},KöprüTech,telefon-aksesuarlari/sarj-kablolari,Standart,E2E import önizlemesi için yeterince uzun ve güvenli ürün açıklaması,20,179.90,5,5,35,5,2`,
    `BAD-${suffix},Hatalı,Kayıp,bilinmeyen,Standart,kısa,20,0,0,0,-1,0,2`,
  ].join("\n");
  await login(
    page,
    "tedarikci@demo.tedarikkopru.local",
    demoUserPassword,
  );
  await page.goto("/tedarikci/import");
  await page.getByLabel("CSV veya XLSX ürün dosyası").setInputFiles({
    name: `e2e-import-${suffix}.csv`,
    mimeType: "text/csv",
    buffer: Buffer.from(csv, "utf8"),
  });
  await page.getByRole("button", { name: "Önizleme oluştur" }).click();
  await expect(page.getByText("Önizleme hazır. Henüz ürün veya stok yazılmadı.")).toBeVisible();
  await expect(page.getByText("Toplam 2 · Geçerli 1 · Hatalı 1")).toBeVisible();
  await expect(page.getByRole("region", { name: "Satır hataları" })).toContainText("Satır 3");
  const confirmResponse = page.waitForResponse(
    (response) => response.url().endsWith("/confirm") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Geçerli satırları uygula" }).click();
  expect((await confirmResponse).status()).toBe(200);
  await expect(page.getByText("1 geçerli satır uygulandı.")).toBeVisible();
  await page.goto("/tedarikci/urunler");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
});
