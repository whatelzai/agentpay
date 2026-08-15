# AgentPay

The trust layer that makes AI spend safely.

Cryptographic confirmation binding for AI-agent payments — closes the prompt-injection gap that the card layer alone cannot. Cards handle credential theft. AgentPay handles the rest.

Built at the [StraitsX AgentiX Playground](https://straitsx.com), Singapore, 14–16 August 2026. Track: Agentic Payments Infrastructure.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript 5
- Tailwind CSS v4
- StraitsX card issuance MCP + XSGD on Avalanche C-Chain (from phase 2)
- Deployed on Vercel

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Scripts

- `npm run dev` — start dev server (Turbopack)
- `npm run build` — production build
- `npm run start` — serve production build
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript type check
- `npm run mcp` — run stdio MCP server locally (for CLI use)

## MCP endpoints

- **HTTP:** `https://agentpay-tan.vercel.app/api/mcp` (Streamable HTTP transport)
- **stdio:** `npm run mcp` (for the AgentPay CLI in phase 3, or local dev)

Consumer connect targets (documented on the landing page): **Claude.ai** (in-app Connectors UI) and **Codex app** (Plugins → MCPs → custom MCP). Claude Code CLI users get a native `@aisystemresources/agentpay` package in phase 3.

## Branches

- `main` → production (auto-deploys to Vercel)
- `feat/*` → preview (auto-deploys per branch)

## Phases

- **Phase 1:** ✅ Landing page.
- **Phase 2 (current):** MCP server (HTTP + stdio) with `ping` + `confirm_purchase` (stub).
- **Phase 3:** CLI at `cli/` with commander + cryptographic EIP-712 confirmation signing + wire to live StraitsX card MCP.

## Process

Process, decisions, signals, and research live in the EMDEE vault under `edmund/03-projects/05-agentpay/`. This repo is code only.
