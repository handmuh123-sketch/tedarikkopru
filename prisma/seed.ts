import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

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

const adapter = new PrismaPg({ connectionString: environment.data.DIRECT_URL });
const database = new PrismaClient({ adapter });

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
}

try {
  await main();
  console.info("Foundation seed tamamlandı.");
} finally {
  await database.$disconnect();
}
