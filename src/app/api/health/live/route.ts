import { type NextRequest, NextResponse } from "next/server";

import { resolveRequestId } from "@/lib/logging/request-id";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const requestId = resolveRequestId(request.headers.get("x-request-id"));

  return NextResponse.json(
    {
      status: "ok",
      service: "tedarikkopru-web",
      requestId,
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "cache-control": "no-store",
        "x-request-id": requestId,
      },
    },
  );
}
