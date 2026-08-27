export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  await import("@/lib/env/server");
  const { database } = await import("@/lib/db/client");
  const channels = ["N11", "PAZARAMA", "PTTAVM", "CICEKSEPETI", "IDEFIX"] as const;

  for (const channel of channels) {
    await database.$executeRawUnsafe(
      `ALTER TYPE "MarketplaceChannel" ADD VALUE IF NOT EXISTS '${channel}'`,
    );
  }
}
