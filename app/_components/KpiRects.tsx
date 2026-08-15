import Link from "next/link";
import { getMonitorMetric, type MonitorMetricSlug } from "@/src/lib/monitor-metrics";
import type { KpiSnapshot } from "@/src/lib/supabase/server";

export type KpiRect = {
  slug: MonitorMetricSlug;
  href: string;
  label: string;
  value: string;
  note: string;
  target: string;
  status: string;
  tone: "healthy" | "neutral" | "warning" | "danger" | "unavailable";
};

function formatPercentage(value: number): string {
  return `${Number(value.toFixed(1))}%`;
}

export function buildKpiRects(kpi: KpiSnapshot | null): KpiRect[] {
  const windowDays = kpi?.window_days ?? 30;
  const hasSample = (kpi?.observed_attempts ?? 0) > 0;
  const hasExecutedOutcomes = kpi?.intent_fidelity_pct != null;

  return [
    {
      slug: "safety-incidents",
      href: "/monitor/safety-incidents",
      label: getMonitorMetric("safety-incidents")!.label,
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
      slug: "safety-refusals",
      href: "/monitor/safety-refusals",
      label: getMonitorMetric("safety-refusals")!.label,
      value: kpi && hasSample ? kpi.attacks_blocked.toString() : "—",
      note: "All fail-closed refusals, including invalid capabilities",
      target: `last ${windowDays}d`,
      status: !kpi || !hasSample ? "not measured" : "observed",
      tone: !kpi || !hasSample ? "unavailable" : "neutral",
    },
    {
      slug: "intent-fidelity",
      href: "/monitor/intent-fidelity",
      label: getMonitorMetric("intent-fidelity")!.label,
      value:
        kpi?.intent_fidelity_pct != null && hasExecutedOutcomes
          ? formatPercentage(kpi.intent_fidelity_pct)
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
      slug: "median-sign",
      href: "/monitor/median-sign",
      label: getMonitorMetric("median-sign")!.label,
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
        <Link
          key={c.label}
          href={c.href}
          aria-label={`${c.label}: ${c.value}. How is this calculated?`}
          className="group border border-rule bg-void flex flex-col p-7 min-h-[310px] transition-[border-color,background-color,transform] duration-300 hover:border-neon/60 hover:bg-ink/[0.025] focus-visible:outline-none focus-visible:border-neon focus-visible:ring-1 focus-visible:ring-neon/40 md:hover:-translate-y-1"
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
            <p
              className={`font-body font-semibold text-ink tabular-nums leading-none tracking-[-0.04em] ${c.value.length >= 5 ? "text-5xl xl:text-6xl" : "text-6xl xl:text-7xl"}`}
            >
              {c.value}
            </p>
          </div>
          <p className="text-sm text-ink/70 leading-relaxed mb-3">{c.note}</p>
          <p className="text-[10px] tracking-[0.18em] uppercase text-muted font-mono">
            {c.target}
          </p>
          <div className="mt-5 pt-4 border-t border-rule flex items-center justify-between gap-4 text-[10px] tracking-[0.14em] uppercase font-mono text-neon opacity-70 transition-all duration-300 md:opacity-0 md:translate-y-1 md:group-hover:opacity-100 md:group-hover:translate-y-0 md:group-focus-visible:opacity-100 md:group-focus-visible:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none">
            <span>How is this calculated?</span>
            <span
              aria-hidden="true"
              className="text-base transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none"
            >
              ↗
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
