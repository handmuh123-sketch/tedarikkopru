import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { database } from "@/lib/db/client";
import { checkDatabaseHealth } from "@/lib/db/health";

describe("PostgreSQL integration", () => {
  beforeAll(async () => {
    try {
      await database.$connect();
    } catch (error) {
      throw new Error(
        "PostgreSQL test veritabanına bağlanılamadı. Önce Docker servislerini, migration ve seed komutlarını çalıştırın.",
        { cause: error },
      );
    }
  });

  afterAll(async () => {
    await database.$disconnect();
  });

  it("gerçek veritabanında readiness sorgusunu çalıştırır", async () => {
    await expect(checkDatabaseHealth()).resolves.toMatchObject({ status: "up" });
  });

  it("idempotent foundation seed kaydını okur", async () => {
    const setting = await database.systemSetting.findUnique({
      where: { key: "foundation.version" },
    });

    expect(setting?.value).toEqual({ phase: 0, status: "ready" });
  });

  it("teknik tarih kolonlarını timezone-aware saklar", async () => {
    const columns = await database.$queryRaw<
      Array<{ column_name: string; data_type: string }>
    >`SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'system_settings'
        AND column_name IN ('created_at', 'updated_at')
      ORDER BY column_name`;

    expect(columns).toEqual([
      { column_name: "created_at", data_type: "timestamp with time zone" },
      { column_name: "updated_at", data_type: "timestamp with time zone" },
    ]);
  });
});
