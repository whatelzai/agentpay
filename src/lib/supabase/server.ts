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
  unauthorized_spends: number;
  attacks_blocked: number;
  authorized_count: number;
  completed_count: number;
  median_sign_time_ms: number | null;
};

export type KpiSnapshot = {
  unauthorized_spends: number;
  attacks_blocked: number;
  intent_fidelity_pct: number | null;
  median_sign_time_ms: number | null;
  window_days: number;
  as_of: string;
};

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
    if (!row) {
      return {
        unauthorized_spends: 0,
        attacks_blocked: 0,
        intent_fidelity_pct: null,
        median_sign_time_ms: null,
        window_days: windowDays,
        as_of: new Date().toISOString(),
      };
    }
    const authorized = Number(row.authorized_count ?? 0);
    const completed = Number(row.completed_count ?? 0);
    return {
      unauthorized_spends: Number(row.unauthorized_spends ?? 0),
      attacks_blocked: Number(row.attacks_blocked ?? 0),
      intent_fidelity_pct:
        completed > 0 ? (authorized / completed) * 100 : null,
      median_sign_time_ms:
        row.median_sign_time_ms != null ? Number(row.median_sign_time_ms) : null,
      window_days: windowDays,
      as_of: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
