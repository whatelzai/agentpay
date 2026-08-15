import { NextResponse } from "next/server";

// Legacy versions polled this GET route and executed a purchase once a
// confirmation appeared in process memory. A read request must never trigger
// payment execution, and Vercel instances do not share that memory. The stage
// demo now carries an opaque capability in same-tab storage and submits it once
// to POST /api/store/demo-execute.
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      error:
        "legacy order polling is disabled; restart the sandbox scenario from /store",
    },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
