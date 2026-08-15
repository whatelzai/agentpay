import Link from "next/link";
import { HeroConnect } from "./_components/HeroConnect";
import { FeedbackForm } from "./_components/FeedbackForm";
import { fetchKpiSnapshot } from "@/src/lib/supabase/server";

// Revalidate every 5 minutes so KPI numbers refresh without a rebuild.
export const revalidate = 300;

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
      <circle cx="24" cy="22" r="3.25" fill="currentColor" />
    </svg>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] tracking-[0.18em] uppercase text-muted font-mono flex items-center gap-3">
      <span className="w-8 h-px bg-seal" aria-hidden="true" />
      {children}
    </p>
  );
}

export default async function Home() {
  const kpi = await fetchKpiSnapshot();

  const cards = [
    {
      label: "Unauthorized",
      value: kpi ? kpi.unauthorized_spends.toString() : "—",
      note: "Payments moved without a matching signature",
      target: "target: 0",
    },
    {
      label: "Attacks blocked",
      value: kpi ? kpi.attacks_blocked.toString() : "—",
      note: "Mint refused because agent request diverged from signed intent",
      target: `last ${kpi?.window_days ?? 30}d`,
    },
    {
      label: "Intent fidelity",
      value:
        kpi?.intent_fidelity_pct != null
          ? `${kpi.intent_fidelity_pct.toFixed(1)}%`
          : "—",
      note: "Completed payments matching the human's signed intent exactly",
      target: "target: 100%",
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

  return (
    <main className="min-h-screen bg-paper text-ink">
      {/* Top bar */}
      <header className="max-w-5xl mx-auto px-6 pt-8 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-ink hover:text-seal transition-colors"
          aria-label="AgentPay home"
        >
          <Mark className="w-7 h-7" />
          <span className="font-display text-xl tracking-tight">agentpay</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/monitor" className="text-muted hover:text-ink transition-colors">
            Scorecard
          </Link>
          <a
            href="https://github.com/whatelzai/agentpay"
            className="text-muted hover:text-ink transition-colors"
          >
            GitHub
          </a>
        </nav>
      </header>

      {/* Section 1 — Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-28 pb-28 md:pt-36">
        <div className="flex justify-center mb-8">
          <Mark className="w-10 h-10 text-seal" />
        </div>
        <div className="text-center mb-10">
          <Kicker>Signed intent</Kicker>
        </div>
        <h1 className="font-display text-5xl md:text-7xl font-medium tracking-tight text-center leading-[1.02] mb-10">
          Every AI purchase
          <br />
          matches what you{" "}
          <em className="text-seal font-normal italic">signed</em>.
        </h1>
        <p className="text-base md:text-lg text-muted leading-relaxed max-w-2xl mx-auto text-center mb-12 font-body">
          Cryptographic confirmation binding for AI-agent payments. Cards
          handle credential theft. AgentPay handles the rest.
        </p>
        <div className="max-w-xl mx-auto">
          <HeroConnect />
        </div>
      </section>

      {/* Section 2 — Public scorecard */}
      <section className="max-w-5xl mx-auto px-6 py-24 border-t border-rule">
        <Kicker>Public scorecard</Kicker>
        <h2 className="font-display text-3xl md:text-4xl font-medium tracking-tight mt-4 mb-3">
          The numbers we hold ourselves to.
        </h2>
        <p className="text-sm text-muted mb-14 max-w-xl">
          Rolling {kpi?.window_days ?? 30}-day window. Full breakdown at{" "}
          <Link href="/monitor" className="text-ink underline decoration-rule decoration-2 underline-offset-4 hover:decoration-seal">
            /monitor
          </Link>
          .
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-14">
          {cards.map((c) => (
            <div key={c.label} className="border-t border-ink pt-6">
              <p className="text-[11px] tracking-[0.18em] uppercase text-muted font-mono mb-4">
                {c.label}
              </p>
              <p className="font-display text-6xl md:text-7xl font-medium text-ink tabular-nums leading-none mb-4">
                {c.value}
              </p>
              <p className="text-sm text-ink/70 leading-relaxed mb-2">
                {c.note}
              </p>
              <p className="text-[11px] tracking-[0.14em] uppercase text-muted font-mono">
                {c.target}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3 — Operating rule */}
      <section className="max-w-3xl mx-auto px-6 py-24 border-t border-rule">
        <Kicker>How we read these numbers</Kicker>
        <h2 className="font-display text-3xl md:text-4xl font-medium tracking-tight mt-4 mb-8">
          Safety before growth.
        </h2>
        <div className="space-y-6 text-base md:text-lg text-ink/80 leading-relaxed max-w-2xl">
          <p>
            More payment volume is not success if execution can drift from
            signed human intent. Safety gates must pass first; utility health
            comes second; adoption evidence comes third. Every failed check
            stops execution before money moves.
          </p>
          <p>
            A blocked attack is not a failure — it is evidence the control
            worked. An unauthorized escape is the incident that matters. The
            scorecard is ordered so no weighted average can average a safety
            failure away.
          </p>
        </div>
      </section>

      {/* Section 4 — Feedback */}
      <section className="max-w-2xl mx-auto px-6 py-24 border-t border-rule">
        <Kicker>Drop a comment</Kicker>
        <h2 className="font-display text-3xl md:text-4xl font-medium tracking-tight mt-4 mb-3">
          Tell us what&apos;s missing.
        </h2>
        <p className="text-sm text-muted mb-10">
          Rough edges, feature asks, security concerns — we read every one.
        </p>
        <FeedbackForm />
      </section>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 py-10 border-t border-rule flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs text-muted flex items-center gap-2 font-mono">
          <Mark className="w-4 h-4" />
          agentpay · signed at{" "}
          <a
            href="https://straitsx.com"
            className="hover:text-ink transition-colors"
          >
            StraitsX AgentiX Playground
          </a>{" "}
          · Singapore · 14–16 Aug 2026
        </p>
        <p className="text-[11px] tracking-[0.14em] uppercase text-muted font-mono">
          Track: Agentic Payments Infrastructure
        </p>
      </footer>
    </main>
  );
}
