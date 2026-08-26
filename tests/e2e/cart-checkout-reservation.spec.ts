import { expect, test } from "@playwright/test";
import { demoUserPassword } from "./test-environment";

test("alıcı ürünü tek tedarikçili sepete ekler ve rezervasyonlu checkout taslağı oluşturur", async ({
  page,
}) => {
  await page.goto("/giris");
  await page.getByLabel("E-posta").fill("alici@demo.tedarikkopru.local");
  await page.getByLabel("Parola").fill(demoUserPassword);
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(page).toHaveURL(/panel/);

  await page.goto("/urunler/60w-orgulu-usb-c-kablo");
  await page.getByLabel("Miktar", { exact: true }).fill("10");
  const addResponse = page.waitForResponse(
    (response) => response.url().endsWith("/cart") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Sepete ekle" }).click();
  expect((await addResponse).status()).toBe(201);
  await expect(page.getByText("Ürün sepete eklendi.")).toBeVisible();
  await page.getByRole("link", { name: "Sepete git" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Sepet" })).toBeVisible();
  await expect(page.getByText("Demo Mobil Tedarik", { exact: true }).first()).toBeVisible();
  await page.getByLabel("Miktar", { exact: true }).fill("15");
  const updateResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/cart/items/") && response.request().method() === "PATCH",
  );
  await page.getByRole("button", { name: "Güncelle" }).click();
  expect((await updateResponse).status()).toBe(200);
  await expect(page.getByText("Sepet miktarı güncellendi.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Checkout'a geç" })).toBeVisible();
  await page.getByRole("link", { name: "Checkout'a geç" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Checkout" })).toBeVisible();
  await expect(page.getByLabel("Teslimat adresi")).toHaveValue(/.+/);
  await expect(page.getByLabel("Fatura adresi")).toHaveValue(/.+/);

  const checkoutResponse = page.waitForResponse(
    (response) => response.url().endsWith("/checkout") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Checkout taslağı oluştur" }).click();
  const checkout = await checkoutResponse;
  expect(checkout.status()).toBe(201);
  const payload = (await checkout.json()) as {
    data: { status: string; reservations: Array<{ quantity: number; status: string }> };
  };
  expect(payload.data.status).toBe("DRAFT");
  expect(payload.data.reservations).toEqual([
    expect.objectContaining({ quantity: 15, status: "ACTIVE" }),
  ]);
  await expect(page.getByRole("heading", { name: "Sipariş taslağı hazır" })).toBeVisible();
  await expect(page.getByText(/Rezervasyon bitişi:/)).toBeVisible();

  const releaseResponse = page.waitForResponse(
    (response) => response.url().endsWith("/release") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Rezervasyonu bırak" }).click();
  expect((await releaseResponse).status()).toBe(200);
  await expect(page.getByText("CANCELLED", { exact: true })).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});
