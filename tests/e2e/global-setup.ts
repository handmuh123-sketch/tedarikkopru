import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../src/generated/prisma/client";

export default async function globalSetup() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("E2E için DATABASE_URL gereklidir.");
  const database = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    await database.rateLimitBucket.deleteMany();
  } finally {
    await database.$disconnect();
  }
}
