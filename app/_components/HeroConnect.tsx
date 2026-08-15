"use client";

import { useState } from "react";

const MCP_URL = "https://agentpay-tan.vercel.app/api/mcp";
const NPM_INSTALL = "npm i -g @aisystemresources/agentpay";

const CONNECTORS = {
  "Claude.ai": {
    subtitle: "Settings → Connectors → Add custom",
    snippet: MCP_URL,
    kind: "url" as const,
  },
  "Claude Code": {
    subtitle: "npm CLI",
    snippet: NPM_INSTALL,
    kind: "shell" as const,
  },
  Codex: {
    subtitle: "Plugins → MCPs → Streamable HTTP",
    snippet: MCP_URL,
    kind: "url" as const,
  },
} as const;

type Agent = keyof typeof CONNECTORS;

export function HeroConnect() {
  const [agent, setAgent] = useState<Agent>("Claude.ai");
  const [copied, setCopied] = useState(false);
  const c = CONNECTORS[agent];

  async function copy() {
    try {
      await navigator.clipboard.writeText(c.snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="border border-rule bg-void/60 backdrop-blur-sm">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-rule">
        <label
          htmlFor="agent-select"
          className="text-[10px] tracking-[0.18em] uppercase text-muted font-mono"
        >
          Connect to
        </label>
        <select
          id="agent-select"
          value={agent}
          onChange={(e) => setAgent(e.target.value as Agent)}
          className="bg-transparent border-none text-ink text-sm focus:outline-none cursor-pointer font-body appearance-none pr-4"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2339FF14' stroke-width='1.5'/%3E%3C/svg%3E\")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right center",
          }}
        >
          {(Object.keys(CONNECTORS) as Agent[]).map((a) => (
            <option key={a} value={a} className="bg-void text-ink">
              {a}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted ml-auto hidden sm:block font-mono">
          {c.subtitle}
        </span>
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-neon font-mono text-sm select-none">
          {c.kind === "shell" ? "$" : "↳"}
        </span>
        <code className="flex-1 font-mono text-sm text-ink truncate">
          {c.snippet}
        </code>
        <button
          onClick={copy}
          className="text-[11px] tracking-[0.18em] uppercase text-muted hover:text-neon transition-colors font-mono"
          aria-label="Copy to clipboard"
        >
          {copied ? "copied" : "copy"}
        </button>
      </div>
    </div>
  );
}
