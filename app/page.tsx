import Link from "next/link";
import { HeroConnect } from "./_components/HeroConnect";
import { FeedbackForm } from "./_components/FeedbackForm";
import { BlocksTable } from "./_components/BlocksTable";
import { buildKpiRects, KpiRects } from "./_components/KpiRects";
import {
  SectionKicker,
  SiteFooter,
  SiteHeader,
  siteFrameClassName,
} from "./_components/SiteChrome";
import { getMonitorEnvironment } from "@/src/lib/monitor";
import { fetchKpiSnapshot } from "@/src/lib/supabase/server";
import { fetchRecentBlocks } from "@/src/lib/telemetry";

export const revalidate = 60;

export default async function Home() {
  const [kpi, blocks] = await Promise.all([
    fetchKpiSnapshot(),
    fetchRecentBlocks(5),
  ]);
  const cards = buildKpiRects(kpi);
  const environment = getMonitorEnvironment();

  return (
    <main className="bg-void text-ink">
      {/* Section 1 — Full-viewport hero */}
      <section className="min-h-screen w-full flex flex-col">
        <SiteHeader active="home" />

        <div
          className={`${siteFrameClassName} flex flex-1 flex-col items-center justify-center pb-16 pt-10`}
        >
          <h1 className="text-center font-body font-semibold tracking-[-0.06em] leading-[0.85] text-[22vw] md:text-[16vw] lg:text-[14rem]">
            <span className="text-ink">agent</span>
            <span className="text-neon">pay</span>
          </h1>
          <p className="mt-8 md:mt-10 text-center text-lg md:text-2xl text-muted font-body">
            Say bye to prompt injections.
          </p>
          <div className="mt-12 md:mt-14 w-full max-w-xl">
            <HeroConnect />
          </div>
        </div>
      </section>

      {/* Section 2 — Public scorecard: 4 KPIs side by side */}
      <section className={`${siteFrameClassName} border-t border-rule py-28`}>
        <SectionKicker>Public scorecard</SectionKicker>
        <h2 className="font-body font-semibold text-3xl md:text-5xl tracking-[-0.03em] mt-6 mb-3">
          The numbers we hold ourselves to.
        </h2>
        <p className="text-sm text-muted mb-16 max-w-xl font-mono">
          Rolling {kpi?.window_days ?? 30}-day window. {kpi ? (
            <>{kpi.observed_attempts.toLocaleString("en-US")} decisions observed. </>
          ) : (
            <>Telemetry unavailable; no metric is assumed green. </>
          )}
          Full breakdown at{" "}
          <Link
            href="/monitor"
            className="text-neon hover:underline underline-offset-4"
          >
            /monitor
          </Link>
          .
        </p>
        <KpiRects items={cards} />
      </section>

      {/* Section 3 — Refused mints table */}
      <section className={`${siteFrameClassName} border-t border-rule py-28`}>
        <SectionKicker>Refused mints · recent</SectionKicker>
        <h2 className="font-body font-semibold text-3xl md:text-5xl tracking-[-0.03em] mt-6 mb-3">
          What the binding just refused.
        </h2>
        <p className="text-sm text-muted mb-14 max-w-2xl font-mono leading-relaxed">
          {environment.label} refusal telemetry. Neon marks a signed tuple
          mismatch; operational failures are labelled separately.
        </p>
        <BlocksTable
          blocks={blocks}
          revealPurchaseDetails={environment.revealPurchaseDetails}
        />
      </section>

      {/* Section 4 — Feedback */}
      <section className={`${siteFrameClassName} border-t border-rule py-28`}>
        <div className="max-w-2xl">
          <SectionKicker>Drop a comment</SectionKicker>
          <h2 className="font-body font-semibold text-3xl md:text-5xl tracking-[-0.03em] mt-6 mb-3">
            Tell us what&apos;s missing.
          </h2>
          <p className="text-sm text-muted mb-12 font-mono">
            Rough edges, feature asks, security concerns — we read every one.
          </p>
          <FeedbackForm />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
