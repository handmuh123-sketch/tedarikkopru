import "server-only";

import { database } from "./client";

export type DatabaseHealth = {
  status: "up";
  latencyMs: number;
};

export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  const start = performance.now();
  await database.$queryRaw`SELECT 1`;

  return {
    status: "up",
    latencyMs: Math.max(0, Math.round(performance.now() - start)),
  };
}
