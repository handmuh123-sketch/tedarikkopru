import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";

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
    where: { key: "identity.version" },
    update: { value: { phase: 1, status: "ready" } },
    create: { key: "identity.version", value: { phase: 1, status: "ready" } },
  });

  if (seedEnvironment.NODE_ENV === "production" || !seedEnvironment.DEMO_SEED_ENABLED) {
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
  }
}

try {
  await main();
  console.info("Faz 1 teknik ve güvenli demo seed tamamlandı.");
} finally {
  await database.$disconnect();
}
