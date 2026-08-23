import "dotenv/config";

import { createCipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { hashPassword } from "better-auth/crypto";

import { PrismaClient } from "../src/generated/prisma/client";
import { parseServerEnvironment } from "../src/lib/env/schema";

const environment = parseServerEnvironment(process.env);

if (!environment.success) {
  throw new Error(
    `Seed ortamı geçersiz: ${environment.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ")}`,
  );
}

const seedEnvironment = environment.data;

function keyedHash(value: string): string {
  return createHmac("sha256", seedEnvironment.DATA_ENCRYPTION_KEY ?? "")
    .update(value.normalize("NFKC").trim().toLocaleLowerCase("tr-TR"))
    .digest("hex");
}

function encryptSensitive(value: string): string {
  const key = createHash("sha256")
    .update(seedEnvironment.DATA_ENCRYPTION_KEY ?? "")
    .digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

const adapter = new PrismaPg({ connectionString: environment.data.DIRECT_URL });
const database = new PrismaClient({ adapter });
const seedAuth = betterAuth({
  baseURL: seedEnvironment.APP_URL,
  secret: seedEnvironment.AUTH_SECRET,
  database: prismaAdapter(database, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, minPasswordLength: 12, autoSignIn: false },
});

async function main() {
  await database.systemSetting.upsert({
    where: { key: "foundation.version" },
    update: {
      value: { phase: 0, status: "ready" },
    },
    create: {
      key: "foundation.version",
      value: { phase: 0, status: "ready" },
    },
  });

  await database.systemSetting.upsert({
    where: { key: "orders.version" },
    update: { value: { phase: "3B-2", status: "ready" } },
    create: { key: "orders.version", value: { phase: "3B-2", status: "ready" } },
  });

  await database.systemSetting.upsert({
    where: { key: "rfq.version" },
    update: { value: { phase: "3C", status: "ready" } },
    create: { key: "rfq.version", value: { phase: "3C", status: "ready" } },
  });

  await database.systemSetting.upsert({
    where: { key: "shipping.version" },
    update: { value: { phase: "4A", status: "ready" } },
    create: { key: "shipping.version", value: { phase: "4A", status: "ready" } },
  });

  await database.systemSetting.upsert({
    where: { key: "returns.version" },
    update: { value: { phase: "4B", status: "ready" } },
    create: { key: "returns.version", value: { phase: "4B", status: "ready" } },
  });

  await database.systemSetting.upsert({
    where: { key: "bank-transfer.version" },
    update: { value: { phase: "4C", status: "ready" } },
    create: { key: "bank-transfer.version", value: { phase: "4C", status: "ready" } },
  });

  await database.systemSetting.upsert({
    where: { key: "catalog.version" },
    update: { value: { phase: "2B", status: "ready" } },
    create: { key: "catalog.version", value: { phase: "2B", status: "ready" } },
  });

  await database.systemSetting.upsert({
    where: { key: "identity.version" },
    update: { value: { phase: 1, status: "ready" } },
    create: { key: "identity.version", value: { phase: 1, status: "ready" } },
  });

  if (seedEnvironment.DEPLOYMENT_ENV === "production" || !seedEnvironment.DEMO_SEED_ENABLED) {
    console.info("Demo hesap seed'i kapalı; yalnız teknik ayarlar güncellendi.");
    return;
  }

  const demoAdminPassword = seedEnvironment.DEMO_ADMIN_PASSWORD;
  const demoUserPassword = seedEnvironment.DEMO_USER_PASSWORD;
  if (
    !demoAdminPassword ||
    !demoUserPassword ||
    demoAdminPassword.length < 12 ||
    demoUserPassword.length < 12
  ) {
    throw new Error("Demo seed açıkken en az 12 karakterli demo parolaları gereklidir.");
  }

  const demoUsers = [
    {
      name: "Faz 1 Platform Yöneticisi",
      email: "admin@demo.tedarikkopru.local",
      password: demoAdminPassword,
      platformRole: "PLATFORM_SUPER_ADMIN" as const,
    },
    {
      name: "Demo Tedarikçi",
      email: "tedarikci@demo.tedarikkopru.local",
      password: demoUserPassword,
      platformRole: "USER" as const,
    },
    {
      name: "Demo Alıcı",
      email: "alici@demo.tedarikkopru.local",
      password: demoUserPassword,
      platformRole: "USER" as const,
    },
  ];

  for (const demoUser of demoUsers) {
    let user = await database.user.findUnique({ where: { email: demoUser.email } });
    if (!user) {
      const created = await seedAuth.api.signUpEmail({
        body: { name: demoUser.name, email: demoUser.email, password: demoUser.password },
      });
      user = await database.user.findUnique({ where: { id: created.user.id } });
    }
    if (!user) throw new Error("Demo kullanıcı oluşturulamadı.");
    await database.user.update({
      where: { id: user.id },
      data: {
        name: demoUser.name,
        emailVerified: true,
        status: "ACTIVE",
        platformRole: demoUser.platformRole,
      },
    });
    const passwordHash = await hashPassword(demoUser.password);
    await database.account.upsert({
      where: {
        providerId_accountId: { providerId: "credential", accountId: user.id },
      },
      update: { password: passwordHash },
      create: {
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: passwordHash,
      },
    });
    await database.session.deleteMany({ where: { userId: user.id } });
  }

  const supplierUser = await database.user.findUniqueOrThrow({
    where: { email: "tedarikci@demo.tedarikkopru.local" },
  });
  const supplier = await database.organization.upsert({
    where: { slug: "demo-mobil-tedarik" },
    update: {
      status: "ACTIVE",
      verificationStatus: "APPROVED",
      verifiedAt: new Date(),
      minimumOrderAmountMinor: 50_000,
    },
    create: {
      type: "SUPPLIER",
      legalName: "Demo Mobil Tedarik Limited Şirketi",
      tradeName: "Demo Mobil Tedarik",
      slug: "demo-mobil-tedarik",
      taxNumberEncrypted: encryptSensitive("9999999999"),
      taxNumberHash: keyedHash("tax:9999999999"),
      taxOffice: "Kadıköy",
      phone: "+90 212 555 0202",
      email: "tedarikci@demo.tedarikkopru.local",
      sector: "Telefon aksesuarları",
      authorizedPerson: "Demo Tedarikçi",
      minimumOrderAmountMinor: 50_000,
      status: "ACTIVE",
      verificationStatus: "APPROVED",
      verifiedAt: new Date(),
      verificationApplications: {
        create: {
          status: "APPROVED",
          riskFlags: [],
          submittedAt: new Date(),
          reviewedAt: new Date(),
        },
      },
    },
  });
  await database.organizationMembership.upsert({
    where: { organizationId_userId: { organizationId: supplier.id, userId: supplierUser.id } },
    update: { role: "OWNER", status: "ACTIVE", joinedAt: new Date() },
    create: {
      organizationId: supplier.id,
      userId: supplierUser.id,
      role: "OWNER",
      status: "ACTIVE",
      joinedAt: new Date(),
    },
  });

  const buyerUser = await database.user.findUniqueOrThrow({
    where: { email: "alici@demo.tedarikkopru.local" },
  });
  const buyer = await database.organization.upsert({
    where: { slug: "demo-mobil-magaza" },
    update: {
      status: "ACTIVE",
      verificationStatus: "APPROVED",
      verifiedAt: new Date(),
    },
    create: {
      type: "RESELLER",
      legalName: "Demo Mobil Mağaza Limited Şirketi",
      tradeName: "Demo Mobil Mağaza",
      slug: "demo-mobil-magaza",
      taxNumberEncrypted: encryptSensitive("8888888888"),
      taxNumberHash: keyedHash("tax:8888888888"),
      taxOffice: "Beşiktaş",
      phone: "+90 212 555 0303",
      email: "alici@demo.tedarikkopru.local",
      sector: "Telefon aksesuarı perakendesi",
      authorizedPerson: "Demo Alıcı",
      status: "ACTIVE",
      verificationStatus: "APPROVED",
      verifiedAt: new Date(),
      verificationApplications: {
        create: {
          status: "APPROVED",
          riskFlags: [],
          submittedAt: new Date(),
          reviewedAt: new Date(),
        },
      },
    },
  });
  await database.organizationMembership.upsert({
    where: { organizationId_userId: { organizationId: buyer.id, userId: buyerUser.id } },
    update: { role: "OWNER", status: "ACTIVE", joinedAt: new Date() },
    create: {
      organizationId: buyer.id,
      userId: buyerUser.id,
      role: "OWNER",
      status: "ACTIVE",
      joinedAt: new Date(),
    },
  });
  const demoAddresses = [
    {
      type: "WAREHOUSE" as const,
      title: "Demo Teslimat Deposu",
      contactName: "Demo Alıcı",
      phone: "+90 212 555 0303",
      city: "İstanbul",
      district: "Beşiktaş",
      neighborhood: "Levent",
      postalCode: "34330",
      line1: "Büyükdere Caddesi No: 1",
      isDefault: true,
    },
    {
      type: "BILLING" as const,
      title: "Demo Fatura Adresi",
      contactName: "Demo Alıcı",
      phone: "+90 212 555 0303",
      city: "İstanbul",
      district: "Beşiktaş",
      neighborhood: "Levent",
      postalCode: "34330",
      line1: "Büyükdere Caddesi No: 1 Kat: 2",
      isDefault: true,
    },
  ];
  for (const address of demoAddresses) {
    const existingAddress = await database.address.findFirst({
      where: { organizationId: buyer.id, type: address.type, title: address.title },
      select: { id: true },
    });
    if (existingAddress) {
      await database.address.update({ where: { id: existingAddress.id }, data: address });
    } else {
      await database.address.create({ data: { organizationId: buyer.id, ...address } });
    }
  }

  const mobileCategory = await database.category.upsert({
    where: { slug: "telefon-aksesuarlari" },
    update: { name: "Telefon Aksesuarları", path: "telefon-aksesuarlari", isActive: true },
    create: {
      name: "Telefon Aksesuarları",
      slug: "telefon-aksesuarlari",
      path: "telefon-aksesuarlari",
      isActive: true,
      sortOrder: 10,
    },
  });
  const cableCategory = await database.category.upsert({
    where: { slug: "sarj-kablolari" },
    update: {
      name: "Şarj Kabloları",
      parentId: mobileCategory.id,
      path: "telefon-aksesuarlari/sarj-kablolari",
      isActive: true,
    },
    create: {
      name: "Şarj Kabloları",
      slug: "sarj-kablolari",
      parentId: mobileCategory.id,
      path: "telefon-aksesuarlari/sarj-kablolari",
      isActive: true,
      sortOrder: 20,
    },
  });
  const caseCategory = await database.category.upsert({
    where: { slug: "telefon-kiliflari" },
    update: {
      name: "Telefon Kılıfları",
      parentId: mobileCategory.id,
      path: "telefon-aksesuarlari/telefon-kiliflari",
      isActive: true,
    },
    create: {
      name: "Telefon Kılıfları",
      slug: "telefon-kiliflari",
      parentId: mobileCategory.id,
      path: "telefon-aksesuarlari/telefon-kiliflari",
      isActive: true,
      sortOrder: 30,
    },
  });
  const audioCategory = await database.category.upsert({
    where: { slug: "mobil-ses" },
    update: {
      name: "Mobil Ses",
      parentId: mobileCategory.id,
      path: "telefon-aksesuarlari/mobil-ses",
      isActive: true,
    },
    create: {
      name: "Mobil Ses",
      slug: "mobil-ses",
      parentId: mobileCategory.id,
      path: "telefon-aksesuarlari/mobil-ses",
      isActive: true,
      sortOrder: 40,
    },
  });

  const brands = await Promise.all(
    [
      { name: "KöprüTech", slug: "koprutech" },
      { name: "MobiLine", slug: "mobiline" },
      { name: "PilotSound", slug: "pilotsound" },
    ].map(({ name, slug }) =>
      database.brand.upsert({
        where: { slug },
        update: { name, status: "ACTIVE" },
        create: { name, slug, status: "ACTIVE" },
      }),
    ),
  );

  const demoProducts = [
    {
      title: "60W Örgülü USB-C Kablo",
      slug: "60w-orgulu-usb-c-kablo",
      categoryId: cableCategory.id,
      brandId: brands[0]!.id,
      sku: "KT-USBC-60W-1M",
      price: 8990,
      moq: 10,
      step: 5,
      stock: 140,
      safetyStock: 15,
      barcode: "8680000000101",
      image: "/demo-products/usb-c-kablo.svg",
      attributes: { renk: "Siyah", uzunluk: "1 m" },
      description:
        "Yoğun mağaza kullanımı için güçlendirilmiş örgü kaplamalı, 60W hızlı şarj destekli bir metre USB-C kablo.",
    },
    {
      title: "30W USB-C Hızlı Şarj Adaptörü",
      slug: "20w-usb-c-hizli-sarj-adaptoru",
      categoryId: cableCategory.id,
      brandId: brands[1]!.id,
      sku: "ML-PD-20W-EU",
      price: 18990,
      moq: 6,
      step: 2,
      stock: 72,
      safetyStock: 8,
      barcode: "8680000000102",
      image: "/demo-products/sarj-adaptoru.svg",
      attributes: { guc: "30 W", renk: "Beyaz" },
      description:
        "PD uyumlu kompakt gövde ve Avrupa tipi fişle mağaza rafına hazır 30W hızlı şarj adaptörü.",
    },
    {
      title: "Darbeye Dayanıklı Şeffaf Kılıf",
      slug: "darbeye-dayanikli-seffaf-kilif",
      categoryId: caseCategory.id,
      brandId: brands[1]!.id,
      sku: "ML-CASE-CLEAR-15",
      price: 7490,
      moq: 20,
      step: 10,
      stock: 230,
      safetyStock: 30,
      barcode: "8680000000103",
      image: "/demo-products/seffaf-kilif.svg",
      attributes: { renk: "Şeffaf", malzeme: "TPU" },
      description:
        "Köşe korumalı, sararmaya dirençli şeffaf TPU telefon kılıfı; pilot ürün standart ölçü varyantıdır.",
    },
    {
      title: "Bluetooth TWS Kablosuz Kulaklık",
      slug: "tws-kablosuz-kulaklik",
      categoryId: audioCategory.id,
      brandId: brands[2]!.id,
      sku: "PS-TWS-A1-WHT",
      price: 42990,
      moq: 4,
      step: 2,
      stock: 48,
      safetyStock: 6,
      barcode: "8680000000104",
      image: "/demo-products/tws-kulaklik.svg",
      attributes: { renk: "Siyah", baglanti: "Bluetooth" },
      description:
        "Dokunmatik kontrollü, şarj kutulu ve günlük kullanım odaklı beyaz TWS kablosuz kulaklık.",
    },
  ];
  for (const item of demoProducts) {
    const product = await database.product.upsert({
      where: { slug: item.slug },
      update: {
        title: item.title,
        categoryId: item.categoryId,
        brandId: item.brandId,
        shortDescription: item.description,
        description: item.description,
        attributes: item.attributes,
        status: "ACTIVE",
        publishedAt: new Date(),
      },
      create: {
        supplierOrganizationId: supplier.id,
        categoryId: item.categoryId,
        brandId: item.brandId,
        title: item.title,
        slug: item.slug,
        shortDescription: item.description,
        description: item.description,
        status: "ACTIVE",
        originCountry: "TR",
        vatRateBasisPoints: 2000,
        warrantyMonths: 24,
        handlingDays: 2,
        attributes: item.attributes,
        publishedAt: new Date(),
      },
    });
    const variant = await database.productVariant.upsert({
      where: { supplierOrganizationId_sku: { supplierOrganizationId: supplier.id, sku: item.sku } },
      update: {
        productId: product.id,
        title: "Standart",
        priceAmountMinor: item.price,
        barcode: item.barcode,
        moq: item.moq,
        quantityStep: item.step,
        status: "ACTIVE",
      },
      create: {
        productId: product.id,
        supplierOrganizationId: supplier.id,
        sku: item.sku,
        title: "Standart",
        optionValues: {},
        packageQuantity: 1,
        moq: item.moq,
        quantityStep: item.step,
        priceAmountMinor: item.price,
        barcode: item.barcode,
        currency: "TRY",
        status: "ACTIVE",
      },
    });
    await database.inventory.upsert({
      where: { variantId: variant.id },
      update: { onHand: item.stock, safetyStock: item.safetyStock },
      create: {
        variantId: variant.id,
        supplierOrganizationId: supplier.id,
        onHand: item.stock,
        safetyStock: item.safetyStock,
      },
    });
    await database.productImage.upsert({
      where: { storageKey: item.image },
      update: {
        productId: product.id,
        variantId: variant.id,
        altText: item.title,
        isPrimary: true,
        sortOrder: 0,
      },
      create: {
        productId: product.id,
        variantId: variant.id,
        storageKey: item.image,
        altText: item.title,
        isPrimary: true,
        sortOrder: 0,
      },
    });
    await database.productFavorite.upsert({
      where: { userId_productId: { userId: buyerUser.id, productId: product.id } },
      update: {},
      create: { userId: buyerUser.id, productId: product.id },
    });
  }
}

try {
  await main();
  console.info("Faz 7B için katalog ve güvenli alıcı/tedarikçi demo seed'i tamamlandı.");
} finally {
  await database.$disconnect();
}
