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

function futureDateInput(): string {
  return new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
}

for (const decision of ["ACCEPTED", "REJECTED"] as const) {
  test(
    "alıcı RFQ oluşturur, tedarikçi teklif verir ve alıcı teklifi " +
      (decision === "ACCEPTED" ? "kabul eder" : "reddeder"),
    async ({ page }) => {
      await login(page, "alici@demo.tedarikkopru.local");
      await page.goto("/urunler/20w-usb-c-hizli-sarj-adaptoru");
      await page.getByLabel("Talep miktarı").fill("6");
      await page.getByLabel("Alıcı notu").fill("E2E RFQ pilot notu.");
      const createResponse = page.waitForResponse(
        (response) => response.url().endsWith("/rfqs") && response.request().method() === "POST",
      );
      await page.getByRole("button", { name: "Teklif talebi oluştur" }).click();
      const rfq = (await (await createResponse).json()) as { data: { id: string } };
      await page.getByRole("link", { name: "Talep detayını aç" }).click();
      await expect(page.getByText("OPEN", { exact: true }).first()).toBeVisible();
      await logout(page);

      await login(page, "tedarikci@demo.tedarikkopru.local");
      await page.goto("/tedarikci/teklifler/" + rfq.data.id);
      await page.getByLabel("Birim fiyat (kuruş)").fill("17000");
      await page.getByLabel("Teklif geçerlilik tarihi").fill(futureDateInput());
      await page.getByLabel("Tedarikçi notu").fill("E2E teklif notu.");
      const offerResponse = page.waitForResponse(
        (response) => response.url().endsWith("/quote") && response.request().method() === "POST",
      );
      await page.getByRole("button", { name: "Teklif ver" }).click();
      expect((await offerResponse).status()).toBe(201);
      await expect(page.getByText("OFFERED", { exact: true }).first()).toBeVisible();
      await logout(page);

      await login(page, "alici@demo.tedarikkopru.local");
      await page.goto("/panel/teklif-talepleri/" + rfq.data.id);
      const decisionResponse = page.waitForResponse(
        (response) =>
          response.url().endsWith("/decision") && response.request().method() === "POST",
      );
      await page
        .getByRole("button", {
          name: decision === "ACCEPTED" ? "Teklifi kabul et" : "Teklifi reddet",
        })
        .click();
      expect((await decisionResponse).status()).toBe(200);
      await expect(page.getByText(decision, { exact: true }).first()).toBeVisible();
      if (decision === "ACCEPTED") {
        const addToCartResponse = page.waitForResponse(
          (response) => response.url().endsWith("/cart") && response.request().method() === "POST",
        );
        await page.getByRole("button", { name: "Teklifi sepete ekle" }).click();
        expect((await addToCartResponse).status()).toBe(201);
        await page.getByRole("link", { name: "Sepete git" }).click();
        await expect(page.getByText("Kabul edilen teklif fiyatı")).toBeVisible();
        await page.getByRole("link", { name: "Checkout'a geç" }).click();
        const checkoutResponse = page.waitForResponse(
          (response) =>
            response.url().endsWith("/checkout") && response.request().method() === "POST",
        );
        await page.getByRole("button", { name: "Checkout taslağı oluştur" }).click();
        expect((await checkoutResponse).status()).toBe(201);
        await expect(page.getByRole("heading", { name: "Sipariş taslağı hazır" })).toBeVisible();
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
        ),
      ).toBe(false);
    },
  );
}
