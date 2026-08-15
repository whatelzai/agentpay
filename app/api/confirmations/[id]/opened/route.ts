import { isRequestId } from "@/src/lib/confirmations";
import { recordConfirmationOpened } from "@/src/lib/telemetry";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// Fire-and-forget beacon from the /confirm page. Records when the human
// opened a confirmation URL so we can measure sign latency.
export async function POST(
  _request: Request,
  { params }: Params,
): Promise<Response> {
  const { id } = await params;
  if (!isRequestId(id)) {
    return Response.json({ error: "invalid request id" }, { status: 400 });
  }
  recordConfirmationOpened(id);
  return Response.json({ ok: true });
}
