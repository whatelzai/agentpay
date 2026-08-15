import { putConfirmation, getConfirmation, isRequestId } from "@/src/lib/confirmations";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params): Promise<Response> {
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
    return Response.json(
      { error: "this request id already holds a confirmation" },
      { status: 409 },
    );
  }
  return Response.json({ stored: true });
}

export async function GET(_request: Request, { params }: Params): Promise<Response> {
  const { id } = await params;
  if (!isRequestId(id)) {
    return Response.json({ error: "invalid request id" }, { status: 400 });
  }
  const token = getConfirmation(id);
  if (!token) return Response.json({ status: "pending" });
  return Response.json({ status: "confirmed", token });
}
