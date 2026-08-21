import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { demoAdminPassword } from "./test-environment";

const password = "E2E-Strong-Password-2026!";

async function findVerificationLink(request: APIRequestContext, email: string): Promise<string> {
  return expect
    .poll(
      async () => {
        const listResponse = await request.get("http://127.0.0.1:8025/api/v1/messages");
        if (!listResponse.ok()) return "";
        const list = await listResponse.json();
        const messages = Array.isArray(list) ? list : (list.messages ?? []);
        const message = messages.find((candidate: unknown) =>
          JSON.stringify(candidate).toLowerCase().includes(email.toLowerCase()),
        );
        const id = message?.ID ?? message?.Id ?? message?.id;
        if (!id) return "";
        const detailResponse = await request.get(`http://127.0.0.1:8025/api/v1/message/${id}`);
        if (!detailResponse.ok()) return "";
        const detail = JSON.stringify(await detailResponse.json())
          .replaceAll("\\u0026", "&")
          .replaceAll("&amp;", "&");
        return (
          detail.match(/http:\/\/127\.0\.0\.1:3000\/api\/auth\/verify-email[^"\\\s<]+/)?.[0] ??
          detail.match(/http:\/\/localhost:3000\/api\/auth\/verify-email[^"\\\s<]+/)?.[0] ??
          ""
        );
      },
      { timeout: 20_000, intervals: [250, 500, 1000] },
    )
    .not.toBe("")
    .then(async () => {
      const list = await (await request.get("http://127.0.0.1:8025/api/v1/messages")).json();
      const messages = Array.isArray(list) ? list : (list.messages ?? []);
      const message = messages.find((candidate: unknown) =>
        JSON.stringify(candidate).toLowerCase().includes(email.toLowerCase()),
      );
      const detail = JSON.stringify(
        await (
          await request.get(
            `http://127.0.0.1:8025/api/v1/message/${message.ID ?? message.Id ?? message.id}`,
          )
        ).json(),
      )
        .replaceAll("\\u0026", "&")
        .replaceAll("&amp;", "&");
      return (
        detail.match(
          /http:\/\/(?:127\.0\.0\.1|localhost):3000\/api\/auth\/verify-email[^"\\\s<]+/,
        )?.[0] ?? ""
      );
    });
}

async function registerVerifyAndLogin(page: Page, request: APIRequestContext, label: string) {
  const email = `e2e-${label}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.test`;
  await page.goto("/kayit");
  await page.getByLabel("Ad soyad").fill(`E2E ${label}`);
  await page.getByLabel("E-posta").fill(email);
  await page.getByLabel("Parola").fill(password);
  await page.getByRole("button", { name: "Ücretsiz hesap oluştur" }).click();
  await expect(page).toHaveURL(/e-posta-dogrula/);
  const verificationLink = await findVerificationLink(request, email);
  const verified = await request.get(verificationLink.replace("localhost", "127.0.0.1"));
  expect(verified.ok() || verified.status() === 302).toBeTruthy();
  await page.goto("/giris");
  await page.getByLabel("E-posta").fill(email);
  await page.getByLabel("Parola").fill(password);
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(page).toHaveURL(/panel/);
  return email;
}

async function completeOnboarding(page: Page, type: "SUPPLIER" | "RESELLER", label: string) {
  const unique = `${label}-${Date.now()}-${Math.floor(Math.random() * 10000)}`.toLowerCase();
  const tradeName = type === "SUPPLIER" ? `E2E Tedarikçi ${unique}` : `E2E Alıcı ${unique}`;
  await page.getByRole("link", { name: "Yeni işletme oluştur" }).click();
  await page.getByLabel("İşletme türü").selectOption(type);
  await page.getByLabel("Yasal unvan").fill(`${tradeName} Limited Şirketi`);
  await page.getByLabel("Ticari ad").fill(tradeName);
  await page.getByLabel("Profil kısa adı").fill(`e2e-${unique}`);
  await page
    .getByLabel("VKN / TCKN")
    .fill(String(Math.floor(1_000_000_000 + Math.random() * 8_999_999_999)));
  await page.getByLabel("Vergi dairesi").fill("Kadıköy");
  await page.getByLabel("Telefon").fill("+90 212 555 0199");
  await page.getByLabel("İşletme e-postası").fill(`org-${unique}@example.test`);
  await page.getByLabel("Yetkili kişi").fill("E2E Yetkili");
  await page.getByRole("button", { name: "İşletmeyi oluştur" }).click();
  await page.getByLabel("İlgili kişi").fill("E2E Yetkili");
  await page.getByLabel("Telefon").fill("+90 212 555 0188");
  await page.getByLabel("İl", { exact: true }).fill("İstanbul");
  await page.getByLabel("İlçe").fill("Kadıköy");
  await page.getByLabel("Açık adres").fill("Test Mahallesi E2E Sokak No 1");
  await page.getByRole("button", { name: "Adresi kaydet" }).click();
  await page.getByLabel("Özel şirket belgesi").setInputFiles({
    name: "vergi-levhasi.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.7\nE2E fixture"),
  });
  await page.getByRole("button", { name: "Belgeyi güvenli yükle" }).click();
  await page.getByRole("button", { name: "Doğrulamaya gönder" }).click();
  await expect(page.getByText("Başvurunuz inceleme kuyruğuna alındı.")).toBeVisible();
  return tradeName;
}

test("tedarikçi kayıt, e-posta doğrulama ve onboarding akışı", async ({ page, request }) => {
  await registerVerifyAndLogin(page, request, "supplier");
  await completeOnboarding(page, "SUPPLIER", "supplier");
  await expect(page.locator("main")).toHaveCSS("overflow-x", /visible|auto/);
});

test("alıcı onboarding ve admin doğrulama state akışı", async ({ page, request }) => {
  await registerVerifyAndLogin(page, request, "buyer");
  const tradeName = await completeOnboarding(page, "RESELLER", "buyer");
  await page.getByRole("link", { name: "Panele dön" }).last().click();
  await page.getByRole("button", { name: "Çıkış yap" }).click();
  await expect(page).toHaveURL(/giris/);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByLabel("E-posta").fill("admin@demo.tedarikkopru.local");
  await page.getByLabel("Parola").fill(demoAdminPassword);
  const adminLoginButton = page.getByRole("button", { name: "Giriş yap" });
  await expect(adminLoginButton).toBeEnabled();
  await adminLoginButton.click();
  await page.getByRole("link", { name: "Doğrulama kuyruğu" }).click();
  const card = page.locator("article").filter({ hasText: tradeName });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "İncelemeye al" }).click();
  await card.getByRole("button", { name: "Onayla" }).click();
  await expect(card).not.toBeVisible();
});
