import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { POST as adminTransition } from "@/app/api/v1/admin/verifications/[applicationId]/transition/route";
import { GET as adminQueue } from "@/app/api/v1/admin/verifications/route";
import { POST as addAddress } from "@/app/api/v1/organizations/[organizationId]/addresses/route";
import { POST as createInvitation } from "@/app/api/v1/organizations/[organizationId]/invitations/route";
import { PATCH as changeMembershipRole } from "@/app/api/v1/organizations/[organizationId]/members/[membershipId]/role/route";
import {
  GET as getOrganization,
  PATCH as updateOrganization,
} from "@/app/api/v1/organizations/[organizationId]/route";
import { POST as uploadDocument } from "@/app/api/v1/organizations/[organizationId]/verification/documents/route";
import { POST as submitVerification } from "@/app/api/v1/organizations/[organizationId]/verification/submit/route";
import { POST as createOrganization } from "@/app/api/v1/organizations/route";
import { GET as getDocument } from "@/app/api/v1/verification-documents/[documentId]/content/route";
import { auth } from "@/lib/auth/server";
import { database } from "@/lib/db/client";
import { drainDevelopmentEmails } from "@/lib/email/sender";

const baseUrl = "http://127.0.0.1:3000";
const password = "Integration-Strong-2026!";

function apiRequest(path: string, body: unknown, cookie?: string, ip = "198.51.100.10") {
  return new Request(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: baseUrl,
      "x-forwarded-for": ip,
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function registerAndLogin(label: string) {
  const email = `phase1-${label}-${randomUUID()}@example.test`;
  const network = `192.0.2.${Math.floor(1 + Math.random() * 250)}`;
  const signup = await auth.handler(
    apiRequest(
      "/api/auth/sign-up/email",
      {
        name: `Test ${label}`,
        email,
        password,
        callbackURL: "/panel",
      },
      undefined,
      network,
    ),
  );
  expect(signup.status).toBe(200);
  const user = await database.user.findUniqueOrThrow({ where: { email } });
  await database.user.update({ where: { id: user.id }, data: { emailVerified: true } });
  const login = await auth.handler(
    apiRequest(
      "/api/auth/sign-in/email",
      { email, password, callbackURL: "/panel" },
      undefined,
      network,
    ),
  );
  expect(login.status).toBe(200);
  const setCookie = login.headers.get("set-cookie") ?? "";
  expect(setCookie).toContain("HttpOnly");
  expect(setCookie.toLowerCase()).toContain("samesite=lax");
  return { email, user, cookie: setCookie.split(";")[0] ?? "" };
}

async function createTestOrganization(cookie: string, suffix: string) {
  const request = apiRequest(
    "/api/v1/organizations",
    {
      type: suffix.includes("buyer") ? "RESELLER" : "SUPPLIER",
      legalName: `Faz 1 ${suffix} Limited Şirketi`,
      tradeName: `Faz 1 ${suffix}`,
      slug: `phase1-${suffix}-${randomUUID()}`.toLowerCase(),
      taxNumber: String(Math.floor(1_000_000_000 + Math.random() * 8_999_999_999)),
      taxOffice: "Kadıköy",
      phone: "+90 212 555 0101",
      email: `org-${randomUUID()}@example.test`,
      authorizedPerson: "Yetkili Kullanıcı",
      sector: "Test",
    },
    cookie,
  );
  const response = await createOrganization(request);
  expect(response.status).toBe(201);
  return (await response.json()).data as { id: string };
}

describe("Phase 1 PostgreSQL security integration", () => {
  beforeAll(async () => {
    await database.$connect();
  });
  afterAll(async () => {
    await database.$disconnect();
  });

  it("email verification ve parola reset tokenlarını düz metin saklamaz", async () => {
    drainDevelopmentEmails();
    const email = `phase1-token-${randomUUID()}@example.test`;
    const signup = await auth.handler(
      apiRequest(
        "/api/auth/sign-up/email",
        {
          name: "Token Test",
          email,
          password,
          callbackURL: "/panel",
        },
        undefined,
        `192.0.2.${Math.floor(1 + Math.random() * 250)}`,
      ),
    );
    expect(signup.status).toBe(200);
    const verificationMail = drainDevelopmentEmails().find((message) =>
      message.subject.includes("doğrulayın"),
    );
    expect(verificationMail).toBeDefined();
    const verificationToken = verificationMail?.text.match(/[?&]token=([^&\s]+)/)?.[1];
    expect(verificationToken).toBeTruthy();
    const storedAfterSignup = JSON.stringify(
      await database.verification.findMany({ where: { expiresAt: { gt: new Date() } } }),
    );
    expect(storedAfterSignup).not.toContain(decodeURIComponent(verificationToken ?? ""));
    expect(storedAfterSignup).not.toContain(email);

    const reset = await auth.handler(
      apiRequest("/api/auth/request-password-reset", { email, redirectTo: "/sifre-yenile" }),
    );
    expect(reset.status).toBe(200);
    const resetMail = drainDevelopmentEmails().find((message) =>
      message.subject.includes("Parolanızı"),
    );
    const resetToken = resetMail?.text.match(/[?&]token=([^&\s]+)/)?.[1];
    expect(resetToken).toBeTruthy();
    const storedAfterReset = JSON.stringify(
      await database.verification.findMany({ where: { expiresAt: { gt: new Date() } } }),
    );
    expect(storedAfterReset).not.toContain(decodeURIComponent(resetToken ?? ""));
  });

  it("Organization A kullanıcısını Organization B okuma ve değiştirmesinden yalıtır", async () => {
    const ownerA = await registerAndLogin("owner-a");
    const ownerB = await registerAndLogin("owner-b");
    const organizationA = await createTestOrganization(ownerA.cookie, "supplier-a");
    const organizationB = await createTestOrganization(ownerB.cookie, "buyer-b");

    const ownRead = await getOrganization(
      new Request(`${baseUrl}/api/v1/organizations/${organizationA.id}`, {
        headers: { cookie: ownerA.cookie },
      }),
      { params: Promise.resolve({ organizationId: organizationA.id }) },
    );
    expect(ownRead.status).toBe(200);
    const crossRead = await getOrganization(
      new Request(`${baseUrl}/api/v1/organizations/${organizationB.id}`, {
        headers: { cookie: ownerA.cookie },
      }),
      { params: Promise.resolve({ organizationId: organizationB.id }) },
    );
    expect(crossRead.status).toBe(404);
    const crossWrite = await updateOrganization(
      apiRequest(
        `/api/v1/organizations/${organizationB.id}`,
        { tradeName: "Yetkisiz değişiklik" },
        ownerA.cookie,
      ),
      { params: Promise.resolve({ organizationId: organizationB.id }) },
    );
    expect(crossWrite.status).toBe(404);

    const viewerMembership = await database.organizationMembership.create({
      data: {
        organizationId: organizationA.id,
        userId: ownerB.user.id,
        role: "VIEWER",
        status: "ACTIVE",
        joinedAt: new Date(),
      },
    });
    const roleChange = await changeMembershipRole(
      apiRequest(
        `/api/v1/organizations/${organizationA.id}/members/${viewerMembership.id}/role`,
        { role: "FINANCE" },
        ownerA.cookie,
      ),
      {
        params: Promise.resolve({
          organizationId: organizationA.id,
          membershipId: viewerMembership.id,
        }),
      },
    );
    expect(roleChange.status).toBe(200);
    await expect(
      database.auditLog.findFirst({
        where: { organizationId: organizationA.id, action: "membership.role_changed" },
      }),
    ).resolves.not.toBeNull();
  });

  it("private belgeyi public URL ve IDOR ile açmaz; kritik işlemleri audit eder", async () => {
    const ownerA = await registerAndLogin("doc-owner-a");
    const ownerB = await registerAndLogin("doc-owner-b");
    const organization = await createTestOrganization(ownerA.cookie, "document-owner");
    const address = await addAddress(
      apiRequest(
        `/api/v1/organizations/${organization.id}/addresses`,
        {
          type: "HEADQUARTERS",
          title: "Merkez",
          contactName: "Yetkili",
          phone: "+90 212 555 0102",
          countryCode: "TR",
          city: "İstanbul",
          district: "Kadıköy",
          line1: "Test Mahallesi No 1",
          isDefault: true,
        },
        ownerA.cookie,
      ),
      { params: Promise.resolve({ organizationId: organization.id }) },
    );
    expect(address.status).toBe(201);

    const form = new FormData();
    form.set("type", "TAX_CERTIFICATE");
    form.set(
      "file",
      new File([new TextEncoder().encode("%PDF-1.7\nphase-one-fixture")], "vergi-levhasi.pdf", {
        type: "application/pdf",
      }),
    );
    const upload = await uploadDocument(
      new Request(`${baseUrl}/api/v1/organizations/${organization.id}/verification/documents`, {
        method: "POST",
        headers: { cookie: ownerA.cookie, origin: baseUrl },
        body: form,
      }),
      { params: Promise.resolve({ organizationId: organization.id }) },
    );
    expect(upload.status).toBe(201);
    const document = (await upload.json()).data as { id: string };
    const ownerRead = await getDocument(
      new Request(`${baseUrl}/api/v1/verification-documents/${document.id}/content`, {
        headers: { cookie: ownerA.cookie },
      }),
      { params: Promise.resolve({ documentId: document.id }) },
    );
    expect(ownerRead.status).toBe(200);
    expect(ownerRead.headers.get("cache-control")).toBe("private, no-store");
    const crossRead = await getDocument(
      new Request(`${baseUrl}/api/v1/verification-documents/${document.id}/content`, {
        headers: { cookie: ownerB.cookie },
      }),
      { params: Promise.resolve({ documentId: document.id }) },
    );
    expect(crossRead.status).toBe(404);

    const stored = await database.verificationDocument.findUniqueOrThrow({
      where: { id: document.id },
    });
    const publicResponse = await fetch(
      `http://127.0.0.1:9000/tedarikkopru-private-test/${stored.storageKey}`,
    );
    expect(publicResponse.status).toBe(403);
    const submit = await submitVerification(
      apiRequest(`/api/v1/organizations/${organization.id}/verification/submit`, {}, ownerA.cookie),
      { params: Promise.resolve({ organizationId: organization.id }) },
    );
    expect(submit.status).toBe(200);
    const actions = await database.auditLog.findMany({
      where: { organizationId: organization.id },
      select: { action: true, afterRedacted: true },
    });
    expect(actions.map((entry) => entry.action)).toEqual(
      expect.arrayContaining([
        "organization.created",
        "verification_document.uploaded",
        "verification.submitted",
      ]),
    );
    expect(JSON.stringify(actions)).not.toContain(ownerA.email);
  }, 30_000);

  it("yetkisiz kullanıcı admin kuyruğunu ve state geçişini kullanamaz", async () => {
    const regular = await registerAndLogin("regular-admin-check");
    const queue = await adminQueue(
      new Request(`${baseUrl}/api/v1/admin/verifications`, { headers: { cookie: regular.cookie } }),
    );
    expect(queue.status).toBe(403);
    const application = await database.verificationApplication.findFirst({
      where: { status: "SUBMITTED" },
    });
    expect(application).not.toBeNull();
    const transition = await adminTransition(
      apiRequest(
        `/api/v1/admin/verifications/${application?.id}/transition`,
        { status: "IN_REVIEW" },
        regular.cookie,
      ),
      { params: Promise.resolve({ applicationId: application?.id ?? "missing" }) },
    );
    expect(transition.status).toBe(403);
  });

  it("platform admini başvuruyu onaylar, değişiklik ister ve reddeder", async () => {
    const admin = await registerAndLogin("platform-admin");
    await database.user.update({
      where: { id: admin.user.id },
      data: { platformRole: "PLATFORM_ADMIN" },
    });
    const organization = await createTestOrganization(admin.cookie, "admin-state-machine");
    const baseApplication = await database.verificationApplication.findFirstOrThrow({
      where: { organizationId: organization.id },
    });
    await database.verificationApplication.update({
      where: { id: baseApplication.id },
      data: { status: "SUBMITTED", submittedAt: new Date() },
    });

    const review = await adminTransition(
      apiRequest(
        `/api/v1/admin/verifications/${baseApplication.id}/transition`,
        { status: "IN_REVIEW" },
        admin.cookie,
      ),
      { params: Promise.resolve({ applicationId: baseApplication.id }) },
    );
    expect(review.status).toBe(200);
    const changes = await adminTransition(
      apiRequest(
        `/api/v1/admin/verifications/${baseApplication.id}/transition`,
        { status: "NEEDS_CHANGES", reason: "Belge tarihi okunamıyor." },
        admin.cookie,
      ),
      { params: Promise.resolve({ applicationId: baseApplication.id }) },
    );
    expect(changes.status).toBe(200);

    const rejectedApplication = await database.verificationApplication.create({
      data: { organizationId: organization.id, version: 2, status: "IN_REVIEW", riskFlags: [] },
    });
    const rejected = await adminTransition(
      apiRequest(
        `/api/v1/admin/verifications/${rejectedApplication.id}/transition`,
        { status: "REJECTED", reason: "Başvuru bilgileri doğrulanamadı." },
        admin.cookie,
      ),
      { params: Promise.resolve({ applicationId: rejectedApplication.id }) },
    );
    expect(rejected.status).toBe(200);

    const approvedApplication = await database.verificationApplication.create({
      data: { organizationId: organization.id, version: 3, status: "IN_REVIEW", riskFlags: [] },
    });
    const approved = await adminTransition(
      apiRequest(
        `/api/v1/admin/verifications/${approvedApplication.id}/transition`,
        { status: "APPROVED" },
        admin.cookie,
      ),
      { params: Promise.resolve({ applicationId: approvedApplication.id }) },
    );
    expect(approved.status).toBe(200);
    await expect(
      database.organization.findUniqueOrThrow({ where: { id: organization.id } }),
    ).resolves.toMatchObject({ status: "ACTIVE", verificationStatus: "APPROVED" });
  });

  it("davet tokenını hashli saklar ve hassas endpoint rate limitini atomik uygular", async () => {
    const owner = await registerAndLogin("invite-owner");
    const organization = await createTestOrganization(owner.cookie, "invite-org");
    drainDevelopmentEmails();
    const invitedEmail = `invite-${randomUUID()}@example.test`;
    const invite = await createInvitation(
      apiRequest(
        `/api/v1/organizations/${organization.id}/invitations`,
        { email: invitedEmail, role: "VIEWER" },
        owner.cookie,
      ),
      { params: Promise.resolve({ organizationId: organization.id }) },
    );
    expect(invite.status).toBe(201);
    const invitationMail = drainDevelopmentEmails().find((message) =>
      message.subject.includes("davet"),
    );
    const token = invitationMail?.text.match(/[?&]token=([^&\s]+)/)?.[1];
    expect(token).toBeTruthy();
    const storedInvitation = await database.organizationInvitation.findFirstOrThrow({
      where: { organizationId: organization.id, email: invitedEmail },
    });
    expect(storedInvitation.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(storedInvitation.tokenHash).not.toBe(decodeURIComponent(token ?? ""));

    await database.rateLimitBucket.deleteMany();
    const attempts = [];
    for (let index = 0; index < 11; index += 1) {
      attempts.push(
        await auth.handler(
          apiRequest(
            "/api/auth/sign-in/email",
            { email: owner.email, password: "wrong-password-value" },
            undefined,
            "203.0.113.77",
          ),
        ),
      );
    }
    expect(
      attempts.slice(0, 10).every((response) => response.status >= 400 && response.status < 500),
    ).toBe(true);
    expect(attempts[10]?.status).toBe(429);
  }, 30_000);

  it("audit log UPDATE/DELETE işlemlerini veritabanı katmanında engeller", async () => {
    const audit = await database.auditLog.findFirstOrThrow();
    await expect(
      database.$executeRaw`UPDATE audit_logs SET action = 'tampered' WHERE id = ${audit.id}`,
    ).rejects.toThrow();
    await expect(
      database.$executeRaw`DELETE FROM audit_logs WHERE id = ${audit.id}`,
    ).rejects.toThrow();
  });
});
