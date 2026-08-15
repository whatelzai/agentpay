import Link from "next/link";
import { HeroConnect } from "./_components/HeroConnect";
import { FeedbackForm } from "./_components/FeedbackForm";
import { BlocksTable } from "./_components/BlocksTable";
import { buildKpiRects, KpiRects } from "./_components/KpiRects";
import { fetchKpiSnapshot } from "@/src/lib/supabase/server";
import { fetchRecentBlocks } from "@/src/lib/telemetry";

export const revalidate = 60;

function Mark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4 10 C 10 14, 14 20, 22 22"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
      <circle cx="24" cy="22" r="3.25" fill="#39FF14" />
    </svg>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] tracking-[0.22em] uppercase text-muted font-mono flex items-center gap-3">
      <span className="w-8 h-px bg-neon" aria-hidden="true" />
      {children}
    </p>
  );
}

export default async function Home() {
  const [kpi, blocks] = await Promise.all([
    fetchKpiSnapshot(),
    fetchRecentBlocks(5),
  ]);
  const cards = buildKpiRects(kpi);

  return (
    <main className="bg-void text-ink">
      {/* Section 1 — Full-viewport hero */}
      <section className="min-h-screen w-full flex flex-col">
        <header className="w-full px-6 md:px-10 pt-6 md:pt-8 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-ink hover:text-neon transition-colors"
            aria-label="AgentPay home"
          >
            <Mark className="w-6 h-6" />
            <span className="font-mono text-sm tracking-[0.14em] uppercase">
              agentpay
            </span>
          </Link>
          <nav className="flex items-center gap-6 text-xs font-mono uppercase tracking-[0.14em]">
            <Link
              href="/monitor"
              className="text-muted hover:text-neon transition-colors"
            >
              Scorecard
            </Link>
            <a
              href="https://github.com/whatelzai/agentpay"
              className="text-muted hover:text-neon transition-colors"
            >
              GitHub
            </a>
          </nav>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
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

      {/* Section 2 — Public scorecard: 3 KPIs side by side */}
      <section className="max-w-6xl mx-auto px-6 md:px-10 py-28 border-t border-rule">
        <Kicker>Public scorecard</Kicker>
        <h2 className="font-body font-semibold text-3xl md:text-5xl tracking-[-0.03em] mt-6 mb-3">
          The numbers we hold ourselves to.
        </h2>
        <p className="text-sm text-muted mb-16 max-w-xl font-mono">
          Rolling {kpi?.window_days ?? 30}-day window. Full breakdown at{" "}
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
      <section className="max-w-6xl mx-auto px-6 md:px-10 py-28 border-t border-rule">
        <Kicker>Refused mints · recent</Kicker>
        <h2 className="font-body font-semibold text-3xl md:text-5xl tracking-[-0.03em] mt-6 mb-3">
          What the binding just refused.
        </h2>
        <p className="text-sm text-muted mb-14 max-w-2xl font-mono leading-relaxed">
          Every refusal is a real row from the sandbox. Neon marks the field
          the agent tried to change after the human signed.
        </p>
        <BlocksTable blocks={blocks ?? []} />
      </section>

      {/* Section 4 — Feedback */}
      <section className="max-w-2xl mx-auto px-6 md:px-10 py-28 border-t border-rule">
        <Kicker>Drop a comment</Kicker>
        <h2 className="font-body font-semibold text-3xl md:text-5xl tracking-[-0.03em] mt-6 mb-3">
          Tell us what&apos;s missing.
        </h2>
        <p className="text-sm text-muted mb-12 font-mono">
          Rough edges, feature asks, security concerns — we read every one.
        </p>
        <FeedbackForm />
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 md:px-10 py-10 border-t border-rule flex flex-wrap items-center justify-between gap-4">
        <p className="text-[11px] text-muted flex items-center gap-2 font-mono uppercase tracking-[0.14em]">
          <Mark className="w-4 h-4" />
          agentpay · signed at{" "}
          <a
            href="https://straitsx.com"
            className="hover:text-neon transition-colors"
          >
            StraitsX AgentiX Playground
          </a>{" "}
          · SG · 14–16 Aug 2026
        </p>
        <p className="text-[10px] tracking-[0.18em] uppercase text-muted font-mono">
          Track: Agentic Payments Infrastructure
        </p>
      </footer>
    </main>
  );
}
