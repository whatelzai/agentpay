import type { KpiSnapshot } from "@/src/lib/supabase/server";

export type KpiRect = {
  label: string;
  value: string;
  note: string;
  target: string;
};

export function buildKpiRects(kpi: KpiSnapshot | null): KpiRect[] {
  const windowDays = kpi?.window_days ?? 30;
  return [
    {
      label: "Unauthorized",
      value: kpi ? kpi.unauthorized_spends.toString() : "0",
      note: "Payments moved without a matching signature",
      target: "target: 0",
    },
    {
      label: "Attacks blocked",
      value: kpi ? kpi.attacks_blocked.toString() : "0",
      note: "Mint refused because agent request diverged from signed intent",
      target: `last ${windowDays}d`,
    },
    {
      label: "Median sign",
      value:
        kpi?.median_sign_time_ms != null
          ? `${(kpi.median_sign_time_ms / 1000).toFixed(1)}s`
          : "—",
      note: "Wall-clock median from opening a confirmation to signing it",
      target: "target: <60s",
    },
  ];
}

export function KpiRects({ items }: { items: KpiRect[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {items.map((c) => (
        <div
          key={c.label}
          className="border border-rule bg-void flex flex-col p-8 min-h-[280px]"
        >
          <p className="text-neon font-mono text-sm md:text-base tracking-[0.22em] uppercase font-semibold">
            {c.label}
          </p>
          <div className="flex-1 flex items-center justify-center py-6">
            <p className="font-body font-semibold text-7xl md:text-8xl text-ink tabular-nums leading-none tracking-[-0.04em]">
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
