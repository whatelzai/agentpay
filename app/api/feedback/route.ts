import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

type Body = { email?: unknown; comment?: unknown };

export async function POST(request: Request): Promise<NextResponse> {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const comment = typeof body.comment === "string" ? body.comment.trim() : "";
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: "invalid email" }, { status: 400 });
  }
  if (comment.length < 1 || comment.length > 4000) {
    return NextResponse.json(
      { error: "comment must be 1-4000 characters" },
      { status: 400 },
    );
  }

  const rawIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "";
  const salt = process.env.FEEDBACK_IP_HASH_SALT ?? "agentpay-feedback";
  const ipHash = rawIp
    ? createHash("sha256").update(rawIp + salt).digest("hex").slice(0, 32)
    : null;

  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("feedback")
    .insert({ email, comment, ip_hash: ipHash });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
