import type { Metadata } from "next";
import { BlocksTable } from "../_components/BlocksTable";
import { buildKpiRects, KpiRects } from "../_components/KpiRects";
import {
  SectionKicker,
  SiteFooter,
  SiteHeader,
  siteFrameClassName,
} from "../_components/SiteChrome";
import { getMonitorEnvironment } from "@/src/lib/monitor";
import { fetchKpiSnapshot } from "@/src/lib/supabase/server";
import { fetchRecentBlocks } from "@/src/lib/telemetry";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "AgentPay Safety Monitor",
  description:
    "Public evidence for AgentPay safety, utility, telemetry health, and signed-intent refusals.",
};

const safeLine = [
  "One merchant, one amount, one expiry, one nonce — signed by the human.",
  "The agent can only mint against what the human signed.",
  "A changed merchant or amount is refused before money moves.",
  "A stale or replayed token expires and cannot be reused.",
  "Every refusal leaves an auditable record with its evidence state visible.",
  "Missing telemetry is labelled — it is never assumed safe.",
] as const;

const unsafeLine = [
  "The agent shows one purchase and mints another.",
  "Prompt injection mutates spend after the human confirmed.",
  "A confirmation token is replayed outside its session window.",
  "Money moves without a cryptographic match to human intent.",
  "One bad decision widens the spend surface past the intended purchase.",
  "A post-payment result cannot be reconciled and remains unresolved.",
] as const;

function formatSnapshotTime(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(value));
}

export default async function MonitorPage() {
  const [kpi, blocks] = await Promise.all([
    fetchKpiSnapshot(),
    fetchRecentBlocks(10),
  ]);
  const windowDays = kpi?.window_days ?? 30;
  const cards = buildKpiRects(kpi);
  const environment = getMonitorEnvironment();
  const telemetryStatus =
    kpi && blocks
      ? kpi.observed_attempts > 0
        ? "Measured"
        : "Connected · no sample"
      : kpi || blocks
        ? "Partial"
        : "Unavailable";
  const telemetryTone =
    telemetryStatus === "Measured"
      ? "text-neon"
      : telemetryStatus === "Unavailable"
        ? "text-seal"
        : "text-amber-300";

  return (
    <main className="bg-void text-ink">
      <SiteHeader active="monitor" />

      {/* Hero */}
      <section
        className={`${siteFrameClassName} pb-16 pt-20 md:pb-20 md:pt-28`}
      >
        <SectionKicker>Public scorecard · rolling {windowDays}d</SectionKicker>
        <h1 className="mt-6 font-body font-semibold text-4xl md:text-6xl tracking-[-0.03em] leading-[1.05] max-w-3xl">
          Money moves only where the human{" "}
          <span className="text-neon">signed</span>.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted leading-relaxed">
          This scorecard reports whether AgentPay&apos;s signed-intent binding is
          holding, how much evidence we observed, and when telemetry cannot
          support a safety claim.
        </p>
      </section>

      {/* Live KPIs — same rectangles as homepage */}
      <section className={`${siteFrameClassName} border-t border-rule py-16`}>
        <div className="grid grid-cols-2 lg:grid-cols-4 border border-rule mb-10">
          <div className="p-5 border-b border-r border-rule lg:border-b-0">
            <p className="text-[9px] tracking-[0.18em] uppercase text-muted font-mono mb-2">
              Telemetry
            </p>
            <p className={`text-sm font-mono ${telemetryTone}`}>
              {telemetryStatus}
            </p>
          </div>
          <div className="p-5 border-b border-rule lg:border-b-0 lg:border-r">
            <p className="text-[9px] tracking-[0.18em] uppercase text-muted font-mono mb-2">
              Environment
            </p>
            <p className="text-sm font-mono text-ink">{environment.label}</p>
          </div>
          <div className="p-5 border-r border-rule">
            <p className="text-[9px] tracking-[0.18em] uppercase text-muted font-mono mb-2">
              Decisions observed
            </p>
            <p className="text-sm font-mono text-ink tabular-nums">
              {kpi ? kpi.observed_attempts.toLocaleString("en-US") : "—"}
            </p>
          </div>
          <div className="p-5">
            <p className="text-[9px] tracking-[0.18em] uppercase text-muted font-mono mb-2">
              Snapshot generated
            </p>
            <p className="text-sm font-mono text-ink">
              {kpi ? (
                <time dateTime={kpi.as_of}>{formatSnapshotTime(kpi.as_of)}</time>
              ) : (
                "—"
              )}
            </p>
          </div>
        </div>
        <KpiRects items={cards} />
        <p className="mt-10 text-[11px] tracking-[0.14em] uppercase text-muted font-mono leading-relaxed">
          refreshed every 60s · a metric turns green only when telemetry is
          available and a relevant sample exists · safety incidents include
          unresolved post-payment outcomes that require human review
        </p>
      </section>

      {/* Refused mints table */}
      <section className={`${siteFrameClassName} border-t border-rule py-24`}>
        <SectionKicker>Safety refusals · recent</SectionKicker>
        <h2 className="mt-6 font-body font-semibold text-3xl md:text-4xl tracking-[-0.03em] mb-3">
          What the binding just refused.
        </h2>
        <p className="text-sm text-muted mb-14 max-w-2xl font-mono leading-relaxed">
          Rows are classified before publication. Neon marks a signed tuple
          mismatch when one exists; capability, configuration, and rail failures
          are labelled separately and are not automatically called attacks.
        </p>
        <BlocksTable
          blocks={blocks}
          revealPurchaseDetails={environment.revealPurchaseDetails}
        />
      </section>

      {/* SAFE / UNSAFE definitions */}
      <section className={`${siteFrameClassName} border-t border-rule py-24`}>
        <SectionKicker>Definitions</SectionKicker>
        <h2 className="mt-6 font-body font-semibold text-3xl md:text-4xl tracking-[-0.03em] mb-14">
          What we call safe. What we call unsafe.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
          <div>
            <p className="text-[10px] tracking-[0.22em] uppercase font-mono text-neon mb-6">
              Safe
            </p>
            <ul className="space-y-4">
              {safeLine.map((line) => (
                <li
                  key={line}
                  className="flex gap-3 text-sm text-ink/80 leading-relaxed"
                >
                  <span className="text-neon font-mono select-none">✓</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] tracking-[0.22em] uppercase font-mono text-muted mb-6">
              Unsafe
            </p>
            <ul className="space-y-4">
              {unsafeLine.map((line) => (
                <li
                  key={line}
                  className="flex gap-3 text-sm text-ink/80 leading-relaxed"
                >
                  <span className="text-muted font-mono select-none">✗</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Operating rule */}
      <section className={`${siteFrameClassName} border-t border-rule py-24`}>
        <SectionKicker>Operating rule</SectionKicker>
        <p className="mt-6 max-w-3xl text-xl md:text-2xl leading-relaxed text-ink/90">
          Safety gates pass first. Utility comes second. Adoption comes third.
          A verified unsafe request refused by the binding is control evidence.
          A confirmed unsafe escape or unresolved post-payment state triggers
          incident response. Missing data never passes a gate.
        </p>
      </section>

      <SiteFooter />
    </main>
  );
}
