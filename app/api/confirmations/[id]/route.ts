import {
  putConfirmation,
  getConfirmation,
  isRequestId,
} from "@/src/lib/confirmations";
import { recordConfirmationSigned } from "@/src/lib/telemetry";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(
  request: Request,
  { params }: Params,
): Promise<Response> {
  const { id } = await params;
  let token: unknown;
  try {
    ({ token } = (await request.json()) as { token?: unknown });
  } catch {
    return Response.json({ error: "body must be JSON" }, { status: 400 });
  }
  if (typeof token !== "string") {
    return Response.json({ error: "token (string) is required" }, { status: 400 });
  }
  const result = putConfirmation(id, token);
  if (result === "invalid") {
    return Response.json(
      { error: "invalid request id or token" },
      { status: 400 },
    );
  }
  if (result === "duplicate") {
    return Response.json({
      stored: false,
      confirmation_token: getConfirmation(id),
    });
  }
  if (result === "stored") {
    await recordConfirmationSigned(id);
  }
  if (result === "unavailable") {
    return Response.json(
      { error: "confirmation sealing is not configured" },
      { status: 503 },
    );
  }
  return Response.json({
    stored: true,
    confirmation_token: getConfirmation(id),
  });
}

export async function GET(
  _request: Request,
  { params }: Params,
): Promise<Response> {
  const { id } = await params;
  if (!isRequestId(id)) {
    return Response.json({ error: "invalid request id" }, { status: 400 });
  }
  const token = getConfirmation(id);
  if (!token) return Response.json({ status: "pending" });
  return Response.json({ status: "confirmed", confirmation_token: token });
}
