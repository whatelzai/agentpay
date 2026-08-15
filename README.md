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

## Branches

- `main` → production (auto-deploys to Vercel)
- `feat/*` → preview (auto-deploys per branch)

## Phases

- **Phase 1 (current):** Vercel-deployed landing page.
- **Phase 2:** MCP server. `app/api/mcp/route.ts` (HTTP) + `src/mcp/server.ts` (stdio). Wraps StraitsX card MCP with confirmation-scoping binding.
- **Phase 3:** CLI at `cli/`. commander-based. `agentpay confirm <intent>` as entry point.

## Process

Process, decisions, signals, and research live in the EMDEE vault under `edmund/03-projects/05-agentpay/`. This repo is code only.
