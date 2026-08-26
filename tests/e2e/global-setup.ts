import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../src/generated/prisma/client";
import { e2eDatabaseUrl } from "./test-environment";

export default async function globalSetup() {
  const database = new PrismaClient({
    adapter: new PrismaPg({ connectionString: e2eDatabaseUrl }),
  });
  try {
    await database.rateLimitBucket.deleteMany();
  } finally {
    await database.$disconnect();
  }
}
