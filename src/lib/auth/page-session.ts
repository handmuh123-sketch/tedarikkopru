import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/server";
import { database } from "@/lib/db/client";

export async function getPageUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const user = await database.user.findFirst({
    where: { id: session.user.id, status: "ACTIVE", deletedAt: null },
  });
  return user ? { session, user } : null;
}

export async function requirePageUser() {
  const context = await getPageUser();
  if (!context) redirect("/giris");
  return context;
}
