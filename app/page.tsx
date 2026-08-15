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
        <p className="text-sm text-neutral-500 leading-relaxed mb-16">
          Built at the{" "}
          <a
            href="https://straitsx.com"
            className="underline underline-offset-4 hover:text-neutral-300"
          >
            StraitsX AgentiX Playground
          </a>
          , Singapore — 14–16 August 2026. Track: Agentic Payments Infrastructure.
        </p>

        <div className="mb-16 flex flex-wrap gap-3">
          <a
            href="/monitor"
            className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20"
          >
            View public safety monitor
          </a>
        </div>

        <div className="pt-16 border-t border-neutral-800">
          <p className="text-sm font-medium text-neutral-500 mb-4 tracking-wider uppercase">
            Connect your agent
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Point Claude or Codex at the AgentPay MCP.
          </h2>
          <p className="text-sm text-neutral-500 mb-8">
            HTTP endpoint (Streamable HTTP transport):{" "}
            <code className="text-emerald-400 text-xs">
              https://agentpay-tan.vercel.app/api/mcp
            </code>
          </p>

          <div className="space-y-10">
            <div>
              <h3 className="text-lg font-semibold mb-2">Claude.ai</h3>
              <p className="text-sm text-neutral-500 mb-4">
                Web or desktop app. Requires a Pro, Max, Team, or Enterprise plan.
              </p>
              <ol className="text-sm text-neutral-400 space-y-2 list-decimal list-inside">
                <li>
                  Open <span className="text-neutral-300">Settings</span> in the
                  sidebar
                </li>
                <li>
                  Navigate to{" "}
                  <span className="text-neutral-300">Connectors</span> →{" "}
                  <span className="text-neutral-300">Add custom connector</span>
                </li>
                <li>
                  Configure:
                  <ul className="ml-6 mt-2 space-y-1 list-disc list-outside text-neutral-400">
                    <li>
                      Name:{" "}
                      <code className="text-emerald-400 text-xs">AgentPay</code>
                    </li>
                    <li>
                      Remote MCP server URL:{" "}
                      <code className="text-emerald-400 text-xs">
                        https://agentpay-tan.vercel.app/api/mcp
                      </code>
                    </li>
                  </ul>
                </li>
                <li>
                  Click <span className="text-neutral-300">Add</span>. The
                  connector shows in every conversation.
                </li>
              </ol>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Codex app</h3>
              <ol className="text-sm text-neutral-400 space-y-2 list-decimal list-inside">
                <li>
                  Open{" "}
                  <span className="text-neutral-300">Plugins</span> →{" "}
                  <span className="text-neutral-300">MCPs</span> →{" "}
                  <span className="text-neutral-300">Add</span>
                </li>
                <li>
                  Select{" "}
                  <span className="text-neutral-300">
                    Connect to a custom MCP
                  </span>
                </li>
                <li>
                  Configure:
                  <ul className="ml-6 mt-2 space-y-1 list-disc list-outside text-neutral-400">
                    <li>
                      Name:{" "}
                      <code className="text-emerald-400 text-xs">AgentPay</code>
                    </li>
                    <li>
                      Type:{" "}
                      <span className="text-neutral-300">Streamable HTTP</span>
                    </li>
                    <li>
                      URL:{" "}
                      <code className="text-emerald-400 text-xs">
                        https://agentpay-tan.vercel.app/api/mcp
                      </code>
                    </li>
                  </ul>
                </li>
                <li>Save. AgentPay tools appear in the composer.</li>
              </ol>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Terminal / CLI</h3>
              <p className="text-sm text-neutral-500 mb-4">
                For Claude Code, Codex CLI, or any terminal-based agent. Node
                20+ required.
              </p>
              <pre className="bg-neutral-900 border border-neutral-800 rounded p-4 text-xs text-neutral-300 overflow-x-auto">
                {`npm install -g @aisystemresources/agentpay

# health check
agentpay ping

# propose a purchase — get a signed confirmation URL
agentpay propose -m "Starbucks" -a 5.50

# after signing, execute the purchase against the token
agentpay execute -t <base64-token> -m "Starbucks" -a 5.50`}
              </pre>
              <p className="text-sm text-neutral-500 mt-3">
                Or one-shot without install:{" "}
                <code className="text-emerald-400 text-xs">
                  npx -p @aisystemresources/agentpay agentpay ping
                </code>
              </p>
            </div>
          </div>

          <p className="text-sm text-neutral-500 mt-8">
            Then ask your agent:{" "}
            <em className="text-neutral-300">
              &ldquo;Use the AgentPay ping tool to confirm the server is
              connected.&rdquo;
            </em>{" "}
            You should see a version string and the transport mode.
          </p>
        </div>
      </div>
    </main>
  );
}
