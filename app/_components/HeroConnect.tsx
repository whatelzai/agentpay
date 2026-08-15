"use client";

import { useState } from "react";

const MCP_URL = "https://agentpay-tan.vercel.app/api/mcp";
const NPM_INSTALL = "npm install -g @aisystemresources/agentpay";

const CONNECTORS = {
  "Claude.ai": {
    subtitle: "In-app connector",
    lines: [
      "Settings → Connectors → Add custom connector",
      `URL: ${MCP_URL}`,
    ],
    copy: MCP_URL,
  },
  "Claude Code": {
    subtitle: "npm CLI",
    lines: [NPM_INSTALL, "agentpay ping"],
    copy: NPM_INSTALL,
  },
  Codex: {
    subtitle: "Custom MCP (Streamable HTTP)",
    lines: [
      "Plugins → MCPs → Add → Connect to a custom MCP",
      "Type: Streamable HTTP",
      `URL: ${MCP_URL}`,
    ],
    copy: MCP_URL,
  },
} as const;

type Agent = keyof typeof CONNECTORS;

export function HeroConnect() {
  const [agent, setAgent] = useState<Agent>("Claude.ai");
  const [copied, setCopied] = useState(false);
  const c = CONNECTORS[agent];

  async function copy() {
    try {
      await navigator.clipboard.writeText(c.copy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Ignore clipboard errors — some browsers block outside secure contexts.
    }
  }

  return (
    <div className="border border-neutral-800 rounded-lg p-4 bg-neutral-950">
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <label
          htmlFor="agent-select"
          className="text-xs text-neutral-500 uppercase tracking-wider"
        >
          Connect to
        </label>
        <select
          id="agent-select"
          value={agent}
          onChange={(e) => setAgent(e.target.value as Agent)}
          className="bg-black border border-neutral-800 text-emerald-400 text-sm rounded px-3 py-1.5 focus:outline-none focus:border-emerald-500"
        >
          {(Object.keys(CONNECTORS) as Agent[]).map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <span className="text-xs text-neutral-500">— {c.subtitle}</span>
      </div>
      <pre className="bg-black border border-neutral-900 rounded p-3 text-xs text-neutral-300 overflow-x-auto whitespace-pre-wrap font-mono">
        {c.lines.join("\n")}
      </pre>
      <button
        onClick={copy}
        className="mt-3 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
      >
        {copied ? "✓ copied" : "copy →"}
      </button>
    </div>
  );
}
