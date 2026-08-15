import { supabaseAdmin } from "./supabase/server";

// Fire-and-forget telemetry. Every insert is wrapped so a Supabase outage or
// missing credentials never blocks the payment path — the KPI numbers are
// observability, not part of the safety contract.

export type SpendOutcome =
  | "authorized"
  | "unauthorized"
  | "refused_mismatch"
  | "refused_expired"
  | "refused_replay"
  | "refused_invalid_sig"
  | "refused_other";

export type SpendAttemptInput = {
  correlationId: string;
  outcome: SpendOutcome;
  decision: "allowed" | "blocked";
  reasonCode?: string;
  signerAddress?: string;
  merchant?: string;
  amountSgdCents?: number;
  rail?: string;
  railStatus?: string;
  evidenceUri?: string;
};

function isConfigured(): boolean {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  return Boolean(url && key);
}

export function recordSpendAttempt(input: SpendAttemptInput): void {
  if (!isConfigured()) return;
  try {
    const client = supabaseAdmin();
    void client
      .from("spend_attempts")
      .insert({
        correlation_id: input.correlationId,
        outcome: input.outcome,
        decision: input.decision,
        reason_code: input.reasonCode ?? null,
        signer_address: input.signerAddress ?? null,
        merchant: input.merchant ?? null,
        amount_sgd_cents: input.amountSgdCents ?? null,
        rail: input.rail ?? null,
        rail_status: input.railStatus ?? null,
        evidence_uri: input.evidenceUri ?? null,
      })
      .then(({ error }) => {
        if (error) console.error("[telemetry] spend_attempt insert:", error.message);
      });
  } catch (err) {
    console.error("[telemetry] spend_attempt threw:", (err as Error).message);
  }
}

export function recordConfirmationOpened(requestId: string): void {
  if (!isConfigured()) return;
  try {
    const client = supabaseAdmin();
    void client
      .from("confirmation_sign_times")
      .upsert(
        { request_id: requestId, opened_at: new Date().toISOString() },
        { onConflict: "request_id", ignoreDuplicates: true },
      )
      .then(({ error }) => {
        if (error) console.error("[telemetry] confirmation opened:", error.message);
      });
  } catch (err) {
    console.error("[telemetry] opened threw:", (err as Error).message);
  }
}

export function recordConfirmationSigned(requestId: string): void {
  if (!isConfigured()) return;
  try {
    const client = supabaseAdmin();
    // Upsert so a sign event without a prior open still lands. If the row
    // exists, only signed_at is updated — the opened_at is preserved.
    void client
      .from("confirmation_sign_times")
      .upsert(
        {
          request_id: requestId,
          signed_at: new Date().toISOString(),
        },
        { onConflict: "request_id" },
      )
      .then(({ error }) => {
        if (error) console.error("[telemetry] confirmation signed:", error.message);
      });
  } catch (err) {
    console.error("[telemetry] signed threw:", (err as Error).message);
  }
}
