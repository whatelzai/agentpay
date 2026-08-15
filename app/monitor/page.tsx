import Link from "next/link";
import { fetchKpiSnapshot } from "@/src/lib/supabase/server";

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

const safeLine = [
  "One merchant, one amount, one expiry, one nonce — signed by the human.",
  "The agent can only mint against what the human signed.",
  "A changed merchant or amount is refused before money moves.",
  "A stale or replayed token expires and cannot be reused.",
  "Every refusal is a signed record — auditable, attributable.",
] as const;

const unsafeLine = [
  "The agent shows one purchase and mints another.",
  "Prompt injection mutates spend after the human confirmed.",
  "A confirmation token is replayed outside its session window.",
  "Money moves without a cryptographic match to human intent.",
  "One bad decision widens the spend surface past the intended purchase.",
] as const;

export default async function MonitorPage() {
  const kpi = await fetchKpiSnapshot();
  const windowDays = kpi?.window_days ?? 30;

  const cards = [
    {
      label: "Unauthorized",
      value: kpi ? kpi.unauthorized_spends.toString() : "0",
      note: "Rail-authorized mints whose executed tuple diverged from the signed tuple. Structurally impossible when the binding holds — this is the escape metric.",
      target: "target: 0",
      onTarget: (kpi?.unauthorized_spends ?? 0) === 0,
    },
    {
      label: "Attacks blocked",
      value: kpi ? kpi.attacks_blocked.toString() : "0",
      note: "Every time Binding.verify() rejected — tuple mismatch, expired confirmation, wrong signer, or a replayed nonce.",
      target: `last ${windowDays}d`,
      onTarget: true,
    },
    {
      label: "Median sign",
      value:
        kpi?.median_sign_time_ms != null
          ? `${(kpi.median_sign_time_ms / 1000).toFixed(1)}s`
          : "—",
      note: "Wall-clock median from a confirmation page opening to the human signing it. Slow safety is skipped safety.",
      target: "target: <60s",
      onTarget:
        kpi?.median_sign_time_ms == null ||
        kpi.median_sign_time_ms <= 60_000,
    },
  ];

  return (
    <main className="bg-void text-ink">
      {/* Top bar (matches homepage) */}
      <header className="max-w-6xl mx-auto px-6 md:px-10 pt-6 md:pt-8 flex items-center justify-between">
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
          <Link href="/" className="text-muted hover:text-neon transition-colors">
            Home
          </Link>
          <a
            href="https://github.com/whatelzai/agentpay"
            className="text-muted hover:text-neon transition-colors"
          >
            GitHub
          </a>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 md:px-10 pt-24 md:pt-32 pb-16">
        <Kicker>Public scorecard · rolling {windowDays}d</Kicker>
        <h1 className="mt-6 font-body font-semibold text-4xl md:text-6xl tracking-[-0.03em] leading-[1.05] max-w-3xl">
          Money moves only where the human{" "}
          <span className="text-neon">signed</span>.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted leading-relaxed">
          AgentPay drives unauthorized agent spend to zero without slowing
          legitimate purchases. These are the numbers that tell us whether the
          binding is holding.
        </p>
      </section>

      {/* Live KPIs */}
      <section className="max-w-6xl mx-auto px-6 md:px-10 py-16 border-t border-rule">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-14">
          {cards.map((c) => (
            <div key={c.label} className="border-t border-ink/40 pt-6">
              <div className="flex items-center justify-between mb-6">
                <p className="text-[10px] tracking-[0.22em] uppercase text-muted font-mono">
                  {c.label}
                </p>
                <span
                  className={`text-[9px] tracking-[0.18em] uppercase font-mono px-2 py-0.5 border ${
                    c.onTarget
                      ? "border-neon/40 text-neon"
                      : "border-rule text-muted"
                  }`}
                >
                  {c.onTarget ? "on target" : "off target"}
                </span>
              </div>
              <p className="font-body font-semibold text-6xl md:text-7xl text-ink tabular-nums leading-none mb-6 tracking-[-0.04em]">
                {c.value}
              </p>
              <p className="text-sm text-ink/70 leading-relaxed mb-3">
                {c.note}
              </p>
              <p className="text-[10px] tracking-[0.18em] uppercase text-muted font-mono">
                {c.target}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-14 text-[11px] tracking-[0.18em] uppercase text-muted font-mono">
          data refreshed every 5 min · numbers stream from execute_purchase and
          confirmation-signing events
        </p>
      </section>

      {/* SAFE / UNSAFE definitions */}
      <section className="max-w-6xl mx-auto px-6 md:px-10 py-24 border-t border-rule">
        <Kicker>Definitions</Kicker>
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
      <section className="max-w-6xl mx-auto px-6 md:px-10 py-24 border-t border-rule">
        <Kicker>Operating rule</Kicker>
        <p className="mt-6 max-w-3xl text-xl md:text-2xl leading-relaxed text-ink/90">
          Safety gates pass first. Utility comes second. Adoption comes third.
          A blocked attack is evidence the control worked. An unauthorized
          escape is the incident that matters.
        </p>
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
