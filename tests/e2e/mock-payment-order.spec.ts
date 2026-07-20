import { expect, test } from "@playwright/test";

test("alıcı checkout taslağını mock ödeme ile PAID siparişe dönüştürür", async ({ page }) => {
  await page.goto("/giris");
  await page.getByLabel("E-posta").fill("alici@demo.tedarikkopru.local");
  await page.getByLabel("Parola").fill(process.env.DEMO_USER_PASSWORD ?? "Faz1-Isletme-Demo-2026!");
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(page).toHaveURL(/panel/);

  await page.goto("/urunler/20w-usb-c-hizli-sarj-adaptoru");
  await page.getByLabel("Miktar").fill("6");
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
  const checkout = await checkoutResponse;
  expect(checkout.status()).toBe(201);
  const checkoutPayload = (await checkout.json()) as {
    data: { order: { id: string; publicNumber: string } };
  };
  const orderNumber = checkoutPayload.data.order.publicNumber;
  await page.getByRole("link", { name: "Sipariş ve ödeme detayına git" }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/siparisler/${checkoutPayload.data.order.id}$`));
  await expect(page.getByRole("heading", { level: 1, name: orderNumber })).toBeVisible();

  const startResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/payments/mock") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Mock ödemeyi başlat" }).click();
  const started = await startResponse;
  expect(started.status()).toBe(201);
  await expect(page.getByText("Mock ödeme başlatıldı; rezervasyon korunuyor.")).toBeVisible();

  const completeResponse = page.waitForResponse(
    (response) => response.url().endsWith("/complete") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Ödemeyi başarılı tamamla" }).click();
  const completed = await completeResponse;
  const completionBody = (await completed.json()) as {
    data?: { status: string; order: { status: string } };
    error?: { code?: string; message?: string };
  };
  expect(completed.status(), JSON.stringify(completionBody)).toBe(200);
  const paymentPayload = completionBody as {
    data: { status: string; order: { status: string } };
  };
  expect(paymentPayload.data).toMatchObject({ status: "SUCCEEDED", order: { status: "PAID" } });
  await expect(page.getByText("PAID", { exact: true }).first()).toBeVisible();
  const paymentStatus = page.getByRole("heading", { name: "Ödeme durumu" }).locator("..");
  await expect(paymentStatus.getByText("SUCCEEDED", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Siparişlere dön" }).click();
  const orderCard = page.locator("article").filter({ hasText: orderNumber });
  await expect(orderCard).toBeVisible();
  await expect(orderCard.getByText("PAID", { exact: true })).toBeVisible();
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});
