import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

// Server-only Supabase client using the service role key. Bypasses RLS.
// NEVER import this file into a client component ("use client") — that would
// bundle the service role key into the browser and give every visitor admin
// access to the database.
export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("Supabase server credentials are not configured");
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export type KpiSnapshotRow = {
  unauthorized_spends: number | string;
  attacks_blocked: number | string;
  authorized_count: number | string;
  completed_count: number | string;
  median_sign_time_ms: number | string | null;
};

export type KpiSnapshot = {
  unauthorized_spends: number;
  attacks_blocked: number;
  authorized_count: number;
  completed_count: number;
  observed_attempts: number;
  intent_fidelity_pct: number | null;
  median_sign_time_ms: number | null;
  window_days: number;
  as_of: string;
};

function nonNegativeNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function normalizeKpiSnapshot(
  row: KpiSnapshotRow | undefined,
  windowDays: number,
  asOf = new Date().toISOString(),
): KpiSnapshot | null {
  if (!row) return null;

  const unauthorized = nonNegativeNumber(row.unauthorized_spends);
  const refused = nonNegativeNumber(row.attacks_blocked);
  const authorized = nonNegativeNumber(row.authorized_count);
  const completed = nonNegativeNumber(row.completed_count);
  if (
    unauthorized == null ||
    refused == null ||
    authorized == null ||
    completed == null
  ) {
    return null;
  }

  const classifiedDecisions = unauthorized + refused + authorized;
  if (completed < classifiedDecisions) return null;

  const medianSignTime =
    row.median_sign_time_ms == null
      ? null
      : nonNegativeNumber(row.median_sign_time_ms);
  const executedOutcomes = authorized + unauthorized;

  return {
    unauthorized_spends: unauthorized,
    attacks_blocked: refused,
    authorized_count: authorized,
    completed_count: completed,
    observed_attempts: completed,
    intent_fidelity_pct:
      executedOutcomes > 0 ? (authorized / executedOutcomes) * 100 : null,
    median_sign_time_ms: medianSignTime,
    window_days: windowDays,
    as_of: asOf,
  };
}

// Fetches the current KPI snapshot for the homepage + /monitor. Returns null
// on any error so pages can render a degraded ("—") state instead of crashing.
export async function fetchKpiSnapshot(
  windowDays = 30,
): Promise<KpiSnapshot | null> {
  try {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase.rpc("kpi_snapshot", {
      window_days: windowDays,
    });
    if (error) return null;
    const row = (Array.isArray(data) ? data[0] : data) as
      | KpiSnapshotRow
      | undefined;
    return normalizeKpiSnapshot(row, windowDays);
  } catch {
    return null;
  }
}
