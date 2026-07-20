import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/server";
import { database } from "@/lib/db/client";

export async function requirePageUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/giris");
  const user = await database.user.findFirst({
    where: { id: session.user.id, status: "ACTIVE", deletedAt: null },
  });
  if (!user) redirect("/giris");
  return { session, user };
}
