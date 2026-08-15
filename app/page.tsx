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

        <div className="pt-16 border-t border-neutral-800">
          <p className="text-sm font-medium text-neutral-500 mb-4 tracking-wider uppercase">
            Connect your agent
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-8">
            Point Claude or Codex at the AgentPay MCP.
          </h2>

          <div className="space-y-10">
            <div>
              <h3 className="text-lg font-semibold mb-3">Claude Desktop</h3>
              <p className="text-sm text-neutral-400 mb-3">
                Edit{" "}
                <code className="text-emerald-400 text-xs">
                  ~/Library/Application Support/Claude/claude_desktop_config.json
                </code>{" "}
                (macOS) or{" "}
                <code className="text-emerald-400 text-xs">
                  %APPDATA%\Claude\claude_desktop_config.json
                </code>{" "}
                (Windows):
              </p>
              <pre className="bg-neutral-900 border border-neutral-800 rounded p-4 text-xs text-neutral-300 overflow-x-auto">
                {`{
  "mcpServers": {
    "agentpay": {
      "url": "https://agentpay-tan.vercel.app/api/mcp"
    }
  }
}`}
              </pre>
              <p className="text-sm text-neutral-500 mt-2">
                Restart Claude Desktop after saving.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Claude Code CLI</h3>
              <pre className="bg-neutral-900 border border-neutral-800 rounded p-4 text-xs text-neutral-300 overflow-x-auto">
                {`claude mcp add --transport http agentpay https://agentpay-tan.vercel.app/api/mcp`}
              </pre>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Codex CLI</h3>
              <pre className="bg-neutral-900 border border-neutral-800 rounded p-4 text-xs text-neutral-300 overflow-x-auto">
                {`codex mcp add --transport http agentpay https://agentpay-tan.vercel.app/api/mcp`}
              </pre>
            </div>
          </div>

          <p className="text-sm text-neutral-500 mt-8">
            Then ask your agent:{" "}
            <em className="text-neutral-300">
              &ldquo;Use the AgentPay ping tool to confirm the server is connected.&rdquo;
            </em>{" "}
            You should see a version string and the transport mode.
          </p>
        </div>
      </div>
    </main>
  );
}
