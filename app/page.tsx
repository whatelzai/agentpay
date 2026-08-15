export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-6 py-24 md:py-32">
        <p className="text-sm font-medium text-emerald-400 mb-4 tracking-wider uppercase">
          AgentPay
        </p>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-[1.05]">
          The trust layer<br />
          that makes AI<br />
          <span className="text-emerald-400">spend safely.</span>
        </h1>
        <p className="text-xl text-neutral-400 max-w-2xl leading-relaxed mb-16">
          Cryptographic confirmation binding for AI-agent payments. Cards handle credential theft. AgentPay closes the prompt-injection gap the card layer alone cannot.
        </p>
        <p className="text-sm text-neutral-500 leading-relaxed">
          Built at the{" "}
          <a
            href="https://straitsx.com"
            className="underline underline-offset-4 hover:text-neutral-300"
          >
            StraitsX AgentiX Playground
          </a>
          , Singapore — 14–16 August 2026. Track: Agentic Payments Infrastructure.
        </p>
      </div>
    </main>
  );
}
