import { HeroConnect } from "./_components/HeroConnect";
import { FeedbackForm } from "./_components/FeedbackForm";
import { fetchKpiSnapshot } from "@/src/lib/supabase/server";

// Revalidate the page every 5 minutes so KPI numbers refresh without a rebuild.
export const revalidate = 300;

export default async function Home() {
  const kpi = await fetchKpiSnapshot();

  const cards = [
    {
      label: "Unauthorized spends",
      value: kpi ? kpi.unauthorized_spends.toString() : "—",
      target: "target: 0",
      meaning:
        "Every completed payment on AgentPay leaves a signed intent the mint layer verifies. If any payment ever moved money without a matching human signature, this counts it. Anything above zero is a safety incident.",
    },
    {
      label: "Attacks blocked at mint",
      value: kpi ? kpi.attacks_blocked.toString() : "—",
      target: `last ${kpi?.window_days ?? 30} days`,
      meaning:
        "Prompt-injected or adversarial mint requests refused at the binding gate. The agent asked to spend on a merchant or amount the human never signed for — AgentPay refused before money moved.",
    },
    {
      label: "Intent fidelity",
      value:
        kpi?.intent_fidelity_pct != null
          ? `${kpi.intent_fidelity_pct.toFixed(1)}%`
          : "—",
      target: "target: 100%",
      meaning:
        "Of every payment that completed, the share where the executed (merchant, amount) matched the human's signed intent exactly. Under 100% means at least one drift got through — a Red state on the Safety Scorecard.",
    },
    {
      label: "Median sign time",
      value:
        kpi?.median_sign_time_ms != null
          ? `${(kpi.median_sign_time_ms / 1000).toFixed(1)}s`
          : "—",
      target: "target: <60s",
      meaning:
        "Wall-clock median from opening a confirmation to signing it. Safety infrastructure only works if people actually use it — slow confirmations get abandoned, which is a different kind of failure.",
    },
  ];

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Section 1 — Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-24 pb-16 md:pt-32">
        <p className="text-sm font-medium text-emerald-400 mb-4 tracking-wider uppercase">
          AgentPay
        </p>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-[1.05]">
          The trust layer
          <br />
          that makes AI
          <br />
          <span className="text-emerald-400">spend safely.</span>
        </h1>
        <p className="text-xl text-neutral-400 max-w-2xl leading-relaxed mb-12">
          Cryptographic confirmation binding for AI-agent payments. Cards
          handle credential theft. AgentPay closes the prompt-injection gap the
          card layer alone cannot.
        </p>
        <HeroConnect />
      </section>

      {/* Section 2 — KPI cards */}
      <section className="max-w-5xl mx-auto px-6 py-16 border-t border-neutral-800">
        <p className="text-sm font-medium text-neutral-500 mb-4 tracking-wider uppercase">
          Public scorecard
        </p>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
          The numbers we hold ourselves to.
        </h2>
        <p className="text-sm text-neutral-500 mb-8">
          Rolling {kpi?.window_days ?? 30}-day window.{" "}
          {kpi ? (
            <>
              Refreshed{" "}
              <time dateTime={kpi.as_of}>
                {new Date(kpi.as_of).toUTCString()}
              </time>
              . Full breakdown at{" "}
            </>
          ) : (
            "Numbers unavailable — full breakdown at "
          )}
          <a href="/monitor" className="text-emerald-400 hover:underline">
            /monitor
          </a>
          .
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <div
              key={c.label}
              className="border border-neutral-800 rounded p-5 bg-neutral-950"
            >
              <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">
                {c.label}
              </p>
              <p className="text-4xl font-bold text-white mb-1 tabular-nums">
                {c.value}
              </p>
              <p className="text-xs text-neutral-600">{c.target}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3 — Meanings */}
      <section className="max-w-3xl mx-auto px-6 py-16 border-t border-neutral-800">
        <p className="text-sm font-medium text-neutral-500 mb-4 tracking-wider uppercase">
          What these numbers mean
        </p>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-8">
          Safety first, then usefulness.
        </h2>
        <div className="space-y-8">
          {cards.map((c) => (
            <div key={c.label}>
              <h3 className="text-lg font-semibold mb-2 text-emerald-400">
                {c.label}
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                {c.meaning}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 4 — Feedback */}
      <section className="max-w-3xl mx-auto px-6 py-16 border-t border-neutral-800">
        <p className="text-sm font-medium text-neutral-500 mb-4 tracking-wider uppercase">
          Drop a comment
        </p>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
          Tell us what&apos;s missing.
        </h2>
        <p className="text-sm text-neutral-500 mb-6">
          Rough edges, feature asks, security concerns — we read every one.
        </p>
        <FeedbackForm />
      </section>

      <footer className="max-w-3xl mx-auto px-6 py-8 border-t border-neutral-800 text-xs text-neutral-600">
        Built at the{" "}
        <a
          href="https://straitsx.com"
          className="underline underline-offset-4 hover:text-neutral-400"
        >
          StraitsX AgentiX Playground
        </a>
        , Singapore — 14–16 August 2026. Track: Agentic Payments Infrastructure.
      </footer>
    </main>
  );
}
