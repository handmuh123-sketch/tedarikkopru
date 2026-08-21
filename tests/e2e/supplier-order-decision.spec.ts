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

async function createPaidOrder(page: Page) {
  await page.goto("/urunler/20w-usb-c-hizli-sarj-adaptoru");
  await page.getByLabel("Miktar", { exact: true }).fill("6");
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
  const checkoutPayload = (await (await checkoutResponse).json()) as {
    data: { order: { id: string; publicNumber: string } };
  };
  await page.getByRole("link", { name: "Sipariş ve ödeme detayına git" }).click();
  const startResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/payments/mock") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Mock ödemeyi başlat" }).click();
  expect((await startResponse).status()).toBe(201);
  const completeResponse = page.waitForResponse(
    (response) => response.url().endsWith("/complete") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Ödemeyi başarılı tamamla" }).click();
  expect((await completeResponse).status()).toBe(200);
  await expect(page.getByText("PAID", { exact: true }).first()).toBeVisible();
  return checkoutPayload.data.order;
}

for (const decision of ["ACCEPTED", "REJECTED"] as const) {
  test(`tedarikçi PAID siparişi ${decision === "ACCEPTED" ? "kabul eder" : "reddeder"} ve alıcı güncel durumu görür`, async ({
    page,
  }) => {
    await login(page, "alici@demo.tedarikkopru.local");
    const order = await createPaidOrder(page);
    await logout(page);

    await login(page, "tedarikci@demo.tedarikkopru.local");
    await page.goto(`/tedarikci/siparisler/${order.id}`);
    await expect(page.getByRole("heading", { level: 1, name: order.publicNumber })).toBeVisible();
    const decisionResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith("/supplier-decision") && response.request().method() === "POST",
    );
    await page
      .getByRole("button", {
        name: decision === "ACCEPTED" ? "Siparişi kabul et" : "Siparişi reddet",
      })
      .click();
    expect((await decisionResponse).status()).toBe(200);
    await expect(page.getByText(decision, { exact: true }).first()).toBeVisible();
    await logout(page);

    await login(page, "alici@demo.tedarikkopru.local");
    await page.goto(`/panel/siparisler/${order.id}`);
    await expect(page.getByText(decision, { exact: true }).first()).toBeVisible();
    await expect(
      page.getByText(
        decision === "ACCEPTED"
          ? "Tedarikçi siparişinizi kabul etti."
          : "Tedarikçi siparişi reddetti. Ödeme iadesi ve iade işlemleri henüz pilot kapsamı dışındadır.",
      ),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      ),
    ).toBe(false);
  });
}
