import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { serverEnvironment } from "@/lib/env/server";

const prismaGlobal = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: serverEnvironment.DATABASE_URL,
  });

  return new PrismaClient({ adapter });
}

export const database = prismaGlobal.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  prismaGlobal.prisma = database;
}
