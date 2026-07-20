import { type NextRequest, NextResponse } from "next/server";

import { checkDatabaseHealth } from "@/lib/db/health";
import { requestLogger } from "@/lib/logging/logger";
import { resolveRequestId } from "@/lib/logging/request-id";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestId = resolveRequestId(request.headers.get("x-request-id"));
  const log = requestLogger(requestId);

  try {
    const database = await checkDatabaseHealth();

    return NextResponse.json(
      {
        status: "ready",
        requestId,
        dependencies: { database },
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "cache-control": "no-store",
          "x-request-id": requestId,
        },
      },
    );
  } catch {
    log.warn({ event: "health.readiness_failed", dependency: "database" }, "Readiness failed");

    return NextResponse.json(
      {
        status: "not_ready",
        requestId,
        dependencies: { database: { status: "down" } },
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: {
          "cache-control": "no-store",
          "x-request-id": requestId,
        },
      },
    );
  }
}
