const coreMetrics = [
  {
    label: "Unauthorized Mint Escape Rate",
    target: "0.00%",
    formula: "unauthorized mints that succeeded / total mint attempts",
    why: "This is the single most important safety number. If an unauthorized spend escapes, AgentPay failed the trust contract.",
  },
  {
    label: "Mismatch Block Rate",
    target: "> 99% when request diverges",
    formula: "divergent mint requests refused / divergent mint requests detected",
    why: "Measures whether the binding layer actually stops unsafe execution when the agent asks for something different from what the user signed.",
  },
  {
    label: "Intent Fidelity Rate",
    target: "> 99.9%",
    formula: "mint requests matching signed merchant+amount / total mint requests",
    why: "Shows how often the system preserves the exact commercial intent the human approved.",
  },
  {
    label: "False Refusal Rate",
    target: "< 1%",
    formula: "safe transactions refused / total safe transactions",
    why: "Safety without usability becomes abandonment. We need to protect the user without blocking normal purchases too often.",
  },
  {
    label: "Time-to-Authorize",
    target: "< 60s median",
    formula: "time from confirmation URL open to mint authorization result",
    why: "If SAFE is too slow, users will route around it. Fast protection is part of the product.",
  },
  {
    label: "Blast Radius per Incident",
    target: "1 merchant, 1 amount, 1 session max",
    formula: "max scope of a compromised or divergent agent action",
    why: "Even when something goes wrong, the loss surface must stay tightly bounded.",
  },
] as const;

const safeLooksLike = [
  "The user signs one merchant, one amount, one expiry, one nonce.",
  "The agent can only mint against exactly what the user signed.",
  "A changed merchant or changed amount is refused automatically.",
  "A stale or replayed confirmation token expires and cannot be reused.",
  "Any failure is visible and attributable instead of silently moving money.",
] as const;

const unsafeLooksLike = [
  "The agent shows one purchase but mints for another.",
  "A prompt-injected tool, page, peer agent, or memory mutation changes spend after confirmation.",
  "A confirmation token can be replayed outside its intended session window.",
  "The system approves money movement without a cryptographic match to user intent.",
  "One bad decision opens a wider spend surface than the single intended purchase.",
] as const;

const positiveBenefits = [
  "Users can delegate spending without handing over open-ended financial authority.",
  "Partners can prove that human-approved intent and actual execution stayed aligned.",
  "Fraud review becomes auditable because every approved spend has a signed ground truth.",
  "Prompt-injection incidents become contained refusals instead of real money loss.",
] as const;

const negativeConsequences = [
  "Unauthorized purchases complete even though the human approved something else.",
  "Trust in the product collapses because users no longer believe confirmation means control.",
  "Merchants, rails, and partners inherit dispute, refund, and reputational overhead.",
  "The product becomes a credential router instead of a trust layer, which breaks the north star.",
] as const;

function StatusChip({
  label,
  tone,
}: {
  label: string;
  tone: "safe" | "unsafe" | "neutral";
}) {
  const className =
    tone === "safe"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : tone === "unsafe"
        ? "border-red-500/30 bg-red-500/10 text-red-300"
        : "border-amber-500/30 bg-amber-500/10 text-amber-200";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${className}`}
    >
      {label}
    </span>
  );
}

export default function MonitorPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(251,191,36,0.12),_transparent_24%),linear-gradient(180deg,_rgba(10,10,10,0.92),_rgba(10,10,10,1))]">
        <div className="mx-auto max-w-6xl px-6 py-20 md:px-8 md:py-24">
          <div className="flex flex-wrap items-center gap-3">
            <StatusChip label="Public Monitor" tone="safe" />
            <StatusChip label="North Star: Spend Safely" tone="neutral" />
          </div>
          <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">
            SAFE means money moves only where the human signed.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-neutral-300">
            AgentPay exists to reduce unauthorized agent spend to zero while
            keeping normal purchases fast and usable. This page is our public
            operating definition of SAFE, UNSAFE, and the numbers that tell us
            whether we are winning or failing.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:px-8">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-8">
            <div className="flex items-center gap-3">
              <StatusChip label="SAFE" tone="safe" />
            </div>
            <p className="mt-5 text-2xl font-semibold">
              A safe transaction preserves intent fidelity end to end.
            </p>
            <p className="mt-4 text-sm leading-7 text-neutral-300">
              The signed commercial intent and the executed commercial action
              are the same merchant, the same amount, and the same bounded
              session.
            </p>
            <ul className="mt-6 space-y-3 text-sm leading-7 text-neutral-200">
              {safeLooksLike.map((item) => (
                <li key={item} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8">
            <div className="flex items-center gap-3">
              <StatusChip label="UNSAFE" tone="unsafe" />
            </div>
            <p className="mt-5 text-2xl font-semibold">
              An unsafe transaction lets execution drift away from approval.
            </p>
            <p className="mt-4 text-sm leading-7 text-neutral-300">
              If the agent, toolchain, or context can mutate spend after the
              user confirms, the system is unsafe even if most transactions
              still look normal.
            </p>
            <ul className="mt-6 space-y-3 text-sm leading-7 text-neutral-200">
              {unsafeLooksLike.map((item) => (
                <li key={item} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-8 md:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-neutral-900/70 p-8 backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-neutral-500">
                Safety Scorecard
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                The numbers that define success
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-neutral-400">
              These are the metrics we should publish, review weekly, and wire
              into telemetry next. Until live data exists, the targets define
              the standard we are committing to.
            </p>
          </div>

          <div className="mt-8 overflow-hidden rounded-3xl border border-white/10">
            <div className="grid grid-cols-1 border-b border-white/10 bg-white/[0.03] px-5 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 md:grid-cols-[1.2fr_0.75fr_1fr_1.15fr]">
              <div>Metric</div>
              <div className="mt-2 md:mt-0">Target</div>
              <div className="mt-2 md:mt-0">Formula</div>
              <div className="mt-2 md:mt-0">Why It Matters</div>
            </div>
            {coreMetrics.map((metric) => (
              <div
                key={metric.label}
                className="grid grid-cols-1 gap-3 border-b border-white/10 px-5 py-5 text-sm last:border-b-0 md:grid-cols-[1.2fr_0.75fr_1fr_1.15fr] md:gap-6"
              >
                <div className="font-medium text-white">{metric.label}</div>
                <div className="text-emerald-300">{metric.target}</div>
                <div className="text-neutral-400">{metric.formula}</div>
                <div className="text-neutral-300">{metric.why}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 py-8 md:grid-cols-2 md:px-8">
        <div className="rounded-3xl border border-white/10 bg-neutral-900 p-8">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-neutral-500">
            Benefits of SAFE
          </p>
          <ul className="mt-6 space-y-3 text-sm leading-7 text-neutral-300">
            {positiveBenefits.map((item) => (
              <li key={item} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-white/10 bg-neutral-900 p-8">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-neutral-500">
            Consequences of UNSAFE
          </p>
          <ul className="mt-6 space-y-3 text-sm leading-7 text-neutral-300">
            {negativeConsequences.map((item) => (
              <li key={item} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-8 md:px-8 md:pb-20">
        <div className="rounded-[2rem] border border-amber-500/20 bg-amber-500/5 p-8">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-amber-200">
            Operating Rule
          </p>
          <p className="mt-4 max-w-4xl text-xl leading-8 text-neutral-100">
            AgentPay is successful when unsafe intent drift is driven toward
            zero without making legitimate purchases painful. If we cannot prove
            that with metrics, then “spend safely” is still a slogan, not an
            operating system.
          </p>
        </div>
      </section>
    </main>
  );
}
