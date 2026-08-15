import type { KpiSnapshot } from "@/src/lib/supabase/server";

export type KpiRect = {
  label: string;
  value: string;
  note: string;
  target: string;
  status: string;
  tone: "healthy" | "neutral" | "warning" | "danger" | "unavailable";
};

export function buildKpiRects(kpi: KpiSnapshot | null): KpiRect[] {
  const windowDays = kpi?.window_days ?? 30;
  const hasSample = (kpi?.observed_attempts ?? 0) > 0;
  const hasExecutedOutcomes = kpi?.intent_fidelity_pct != null;

  return [
    {
      label: "Safety incidents",
      value: kpi && hasSample ? kpi.unauthorized_spends.toString() : "—",
      note: "Confirmed or unresolved post-payment events requiring review",
      target: "target: 0",
      status:
        !kpi || !hasSample
          ? "not measured"
          : kpi.unauthorized_spends === 0
            ? "on target"
            : "incident",
      tone:
        !kpi || !hasSample
          ? "unavailable"
          : kpi.unauthorized_spends === 0
            ? "healthy"
            : "danger",
    },
    {
      label: "Safety refusals",
      value: kpi && hasSample ? kpi.attacks_blocked.toString() : "—",
      note: "All fail-closed refusals, including invalid capabilities",
      target: `last ${windowDays}d`,
      status: !kpi || !hasSample ? "not measured" : "observed",
      tone: !kpi || !hasSample ? "unavailable" : "neutral",
    },
    {
      label: "Intent fidelity",
      value:
        kpi?.intent_fidelity_pct != null && hasExecutedOutcomes
          ? `${kpi.intent_fidelity_pct.toFixed(1)}%`
          : "—",
      note: "Safe outcomes among payments that moved or may have moved money",
      target: "target: 100%",
      status:
        kpi?.intent_fidelity_pct == null || !hasExecutedOutcomes
          ? "not measured"
          : kpi.intent_fidelity_pct === 100
            ? "on target"
            : "below target",
      tone:
        kpi?.intent_fidelity_pct == null || !hasExecutedOutcomes
          ? "unavailable"
          : kpi.intent_fidelity_pct === 100
            ? "healthy"
            : "danger",
    },
    {
      label: "Median sign",
      value:
        kpi?.median_sign_time_ms != null
          ? `${(kpi.median_sign_time_ms / 1000).toFixed(1)}s`
          : "—",
      note: "Wall-clock median from opening a confirmation to signing it",
      target: "target: <60s",
      status:
        kpi?.median_sign_time_ms == null
          ? "not measured"
          : kpi.median_sign_time_ms < 60_000
            ? "on target"
            : "needs attention",
      tone:
        kpi?.median_sign_time_ms == null
          ? "unavailable"
          : kpi.median_sign_time_ms < 60_000
            ? "healthy"
            : "warning",
    },
  ];
}

const TONE_CLASS: Record<KpiRect["tone"], string> = {
  healthy: "border-neon/40 text-neon",
  neutral: "border-ink/30 text-ink/70",
  warning: "border-amber-300/40 text-amber-300",
  danger: "border-seal/60 text-seal",
  unavailable: "border-rule text-muted",
};

export function KpiRects({ items }: { items: KpiRect[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {items.map((c) => (
        <div
          key={c.label}
          className="border border-rule bg-void flex flex-col p-7 min-h-[280px]"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="text-neon font-mono text-sm tracking-[0.18em] uppercase font-semibold">
              {c.label}
            </p>
            <p
              className={`border px-2 py-1 text-[9px] tracking-[0.14em] uppercase font-mono ${TONE_CLASS[c.tone]}`}
            >
              {c.status}
            </p>
          </div>
          <div className="flex-1 flex items-center justify-center py-6">
            <p className="font-body font-semibold text-6xl xl:text-7xl text-ink tabular-nums leading-none tracking-[-0.04em]">
              {c.value}
            </p>
          </div>
          <p className="text-sm text-ink/70 leading-relaxed mb-3">{c.note}</p>
          <p className="text-[10px] tracking-[0.18em] uppercase text-muted font-mono">
            {c.target}
          </p>
        </div>
      ))}
    </div>
  );
}
