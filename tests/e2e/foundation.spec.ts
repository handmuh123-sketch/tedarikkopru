import { expect, test } from "@playwright/test";

test("ana sayfa erişilebilir temel içeriği gösterir", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "İşletmeler arası tedarik için güvenilir bir köprü.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Canlılık durumunu aç" })).toBeVisible();
  await expect(page.getByText("Canlı entegrasyonlar varsayılan kapalı")).toBeVisible();
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();

  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Ana içeriğe geç" });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("liveness endpoint request ID ve güvenlik başlıkları döndürür", async ({ request }) => {
  const response = await request.get("/api/health/live", {
    headers: { "x-request-id": "e2e-foundation-001" },
  });

  expect(response.ok()).toBe(true);
  expect(response.headers()["x-request-id"]).toBe("e2e-foundation-001");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  await expect(response.json()).resolves.toMatchObject({
    status: "ok",
    requestId: "e2e-foundation-001",
  });
});

test("readiness endpoint gerçek veritabanı durumunu döndürür", async ({ request }) => {
  const response = await request.get("/api/health/ready", {
    headers: { "x-request-id": "e2e-readiness-001" },
  });

  expect(response.ok()).toBe(true);
  expect(response.headers()["x-request-id"]).toBe("e2e-readiness-001");
  await expect(response.json()).resolves.toMatchObject({
    status: "ready",
    requestId: "e2e-readiness-001",
    dependencies: { database: { status: "up" } },
  });
});
