import { NextResponse } from "next/server";
import { fetchKpiSnapshot } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 300;

// Public read-only KPI snapshot. Anyone can call this — the underlying data
// is aggregate counts and percentiles, no PII. Cached 5 min at the edge.
export async function GET(): Promise<NextResponse> {
  const kpi = await fetchKpiSnapshot();
  if (!kpi) {
    return NextResponse.json(
      { error: "kpi snapshot unavailable" },
      { status: 503 },
    );
  }
  return NextResponse.json(kpi);
}
