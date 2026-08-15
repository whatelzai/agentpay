import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildKpiRects } from "../../_components/KpiRects";
import {
  SectionKicker,
  SiteFooter,
  SiteHeader,
  siteFrameClassName,
} from "../../_components/SiteChrome";
import {
  getMonitorMetric,
  MONITOR_METRICS,
} from "@/src/lib/monitor-metrics";
import { fetchKpiSnapshot } from "@/src/lib/supabase/server";

export const revalidate = 60;

type MetricPageProps = {
  params: Promise<{ metric: string }>;
};

const INTERPRETATION_STYLE = {
  healthy: "border-neon/40 text-neon",
  neutral: "border-rule text-muted",
  warning: "border-amber-300/40 text-amber-300",
  danger: "border-seal/60 text-seal",
} as const;

const CURRENT_STATUS_STYLE = {
  healthy: "border-neon/40 text-neon",
  neutral: "border-ink/30 text-ink/70",
  warning: "border-amber-300/40 text-amber-300",
  danger: "border-seal/60 text-seal",
  unavailable: "border-rule text-muted",
} as const;

export function generateStaticParams() {
  return MONITOR_METRICS.map(({ slug }) => ({ metric: slug }));
}

export async function generateMetadata({
  params,
}: MetricPageProps): Promise<Metadata> {
  const { metric: slug } = await params;
  const metric = getMonitorMetric(slug);
  if (!metric) return {};

  return {
    title: `${metric.label} calculation · AgentPay`,
    description: `How AgentPay calculates ${metric.label.toLowerCase()}, what is included, and how to interpret the target.`,
  };
}

export default async function MetricPage({ params }: MetricPageProps) {
  const { metric: slug } = await params;
  const metric = getMonitorMetric(slug);
  if (!metric) notFound();

  const kpi = await fetchKpiSnapshot();
  const card = buildKpiRects(kpi).find((item) => item.slug === metric.slug);
  if (!card) notFound();

  const otherMetrics = MONITOR_METRICS.filter(
    (item) => item.slug !== metric.slug,
  );

  return (
    <main className="min-h-screen bg-void text-ink">
      <SiteHeader active="monitor" />

      <section className={`${siteFrameClassName} pb-20 pt-20 md:pt-28`}>
        <Link
          href="/monitor"
          className="inline-flex items-center gap-2 text-[10px] tracking-[0.18em] uppercase text-muted hover:text-neon font-mono transition-colors"
        >
          <span aria-hidden="true">←</span>
          Back to scoreboard
        </Link>
        <div className="mt-14">
          <SectionKicker>
            Metric contract · rolling {kpi?.window_days ?? 30}d
          </SectionKicker>
        </div>
        <h1 className="mt-6 font-body font-semibold text-4xl md:text-6xl tracking-[-0.04em] leading-[1.02] max-w-4xl">
          How AgentPay calculates{" "}
          <span className="text-neon">{metric.label.toLowerCase()}</span>.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted leading-relaxed">
          {metric.summary}
        </p>
      </section>

      <section className={`${siteFrameClassName} border-t border-rule py-16`}>
        <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-6">
          <div className="border border-rule p-7 md:p-9 min-h-[310px] flex flex-col">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="text-neon font-mono text-sm tracking-[0.18em] uppercase font-semibold">
                Current value
              </p>
              <p
                className={`border px-2 py-1 text-[9px] tracking-[0.14em] uppercase font-mono ${CURRENT_STATUS_STYLE[card.tone]}`}
              >
                {card.status}
              </p>
            </div>
            <p className="flex-1 flex items-center justify-center py-8 font-body font-semibold text-7xl md:text-8xl tabular-nums tracking-[-0.05em]">
              {card.value}
            </p>
            <p className="text-sm text-muted leading-relaxed">{card.note}</p>
            <p className="mt-3 text-[10px] tracking-[0.18em] uppercase text-muted font-mono">
              {card.target}
            </p>
          </div>

          <div className="border border-neon/30 bg-neon/[0.025] p-7 md:p-9">
            <p className="text-[10px] tracking-[0.2em] uppercase text-neon font-mono">
              Formula
            </p>
            <p className="mt-7 font-mono text-lg md:text-2xl leading-relaxed text-ink break-words">
              {metric.formula}
            </p>
            <p className="mt-8 text-sm md:text-base text-muted leading-relaxed max-w-2xl">
              {metric.calculation}
            </p>
            <dl className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-rule pt-7">
              <div>
                <dt className="text-[9px] tracking-[0.18em] uppercase text-muted font-mono">
                  Source
                </dt>
                <dd className="mt-2 text-xs text-ink/80 font-mono break-words">
                  {metric.sourceField}
                </dd>
              </div>
              <div>
                <dt className="text-[9px] tracking-[0.18em] uppercase text-muted font-mono">
                  Target
                </dt>
                <dd className="mt-2 text-xs text-ink/80 font-mono">
                  {metric.target}
                </dd>
              </div>
              <div>
                <dt className="text-[9px] tracking-[0.18em] uppercase text-muted font-mono">
                  Window
                </dt>
                <dd className="mt-2 text-xs text-ink/80 font-mono">
                  Rolling {kpi?.window_days ?? 30} days
                </dd>
              </div>
              <div>
                <dt className="text-[9px] tracking-[0.18em] uppercase text-muted font-mono">
                  Refresh
                </dt>
                <dd className="mt-2 text-xs text-ink/80 font-mono">
                  Every 60 seconds
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className={`${siteFrameClassName} border-t border-rule py-20`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-neon font-mono mb-6">
              Included
            </p>
            <ul className="space-y-5">
              {metric.included.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-relaxed text-ink/80">
                  <span className="text-neon font-mono" aria-hidden="true">
                    +
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted font-mono mb-6">
              Not counted
            </p>
            <ul className="space-y-5">
              {metric.excluded.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-relaxed text-ink/80">
                  <span className="text-muted font-mono" aria-hidden="true">
                    −
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className={`${siteFrameClassName} border-t border-rule py-20`}>
        <p className="text-[10px] tracking-[0.2em] uppercase text-muted font-mono">
          How to read the status
        </p>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
          {metric.interpretation.map((item) => (
            <div key={item.label} className="border border-rule p-6">
              <p
                className={`inline-block border px-2 py-1 text-[9px] tracking-[0.14em] uppercase font-mono ${INTERPRETATION_STYLE[item.tone]}`}
              >
                {item.label}
              </p>
              <p className="mt-5 text-sm text-muted leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-10 border-l-2 border-neon px-6 py-2 max-w-3xl">
          <p className="text-[10px] tracking-[0.18em] uppercase text-neon font-mono">
            What this number cannot prove
          </p>
          <p className="mt-4 text-sm md:text-base text-ink/80 leading-relaxed">
            {metric.limitation}
          </p>
        </div>
      </section>

      <section className={`${siteFrameClassName} border-t border-rule py-20`}>
        <p className="text-[10px] tracking-[0.2em] uppercase text-muted font-mono">
          Other calculations
        </p>
        <div className="mt-7 grid grid-cols-1 md:grid-cols-3 gap-4">
          {otherMetrics.map((item) => (
            <Link
              key={item.slug}
              href={`/monitor/${item.slug}`}
              className="group border border-rule p-5 flex items-center justify-between gap-4 hover:border-neon/60 focus-visible:outline-none focus-visible:border-neon transition-colors"
            >
              <span className="font-mono text-xs uppercase tracking-[0.14em] text-ink/80 group-hover:text-neon transition-colors">
                {item.label}
              </span>
              <span className="text-neon" aria-hidden="true">
                ↗
              </span>
            </Link>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
