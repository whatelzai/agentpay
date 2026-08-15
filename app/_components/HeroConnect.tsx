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
    <div className="border border-rule bg-paper">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-rule">
        <label
          htmlFor="agent-select"
          className="text-[10px] tracking-[0.14em] uppercase text-muted font-mono"
        >
          Connect to
        </label>
        <select
          id="agent-select"
          value={agent}
          onChange={(e) => setAgent(e.target.value as Agent)}
          className="bg-transparent border-none text-ink text-sm focus:outline-none cursor-pointer font-body"
        >
          {(Object.keys(CONNECTORS) as Agent[]).map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted ml-auto hidden sm:block">
          {c.subtitle}
        </span>
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-seal font-mono text-sm select-none">
          {c.kind === "shell" ? "$" : "↳"}
        </span>
        <code className="flex-1 font-mono text-sm text-ink truncate">
          {c.snippet}
        </code>
        <button
          onClick={copy}
          className="text-[11px] tracking-[0.14em] uppercase text-muted hover:text-ink transition-colors font-mono"
          aria-label="Copy to clipboard"
        >
          {copied ? "copied" : "copy"}
        </button>
      </div>
    </div>
  );
}
