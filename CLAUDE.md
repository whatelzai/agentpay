# AgentPay — Repo context for Claude Code

## What this is

AgentPay: cryptographic confirmation-scoping binding for AI-agent payments. Built at the StraitsX AgentiX Playground hackathon, Singapore, 14–16 August 2026.

## Source-of-truth split

- **This repo:** code, deployment, build.
- **EMDEE vault:** process, decisions, signals, research. Access via `emdee` CLI. All strategic docs live under `edmund/03-projects/05-agentpay/`.

When making architectural or scope decisions, refer to (and update) the vault. Do not duplicate strategy into this repo.

## Committed decisions (from vault)

- **DEC-001:** SPEND SAFELY is Track 2's north star. Every build item must push toward prompt-injection defense at the payment layer.
- **DEC-002:** Focus on prompt injection specifically. Three source categories (content-source / peer / persistent-state). Two live demo scenarios (web-page injection + A2A injection). Explicit non-goals: direct user injection, phishing, card-layer compromise.

## Stack

- Next.js 16 (App Router), React 19, TypeScript 5 (strict)
- Tailwind CSS v4 (PostCSS-based, no `tailwind.config.js`)
- npm, Node >= 20
- `@modelcontextprotocol/sdk` v1 (phase 2)
- `commander` v12 (phase 3)

## Commands

- `npm run dev` — dev server (Turbopack)
- `npm run build` — prod build
- `npm run start` — prod server
- `npm run lint` — ESLint

## Deployment

- `main` → production Vercel (auto)
- `feat/*` → preview Vercel per branch (auto)
- Never force-push to main
- Never commit `.env*` (only `.env.example`)

## Phases

- **Phase 1 (current):** Vercel-deployed landing page. Static, no MCP or CLI yet.
- **Phase 2:** MCP server. `app/api/mcp/route.ts` (HTTP) + `src/mcp/server.ts` (stdio). Wraps StraitsX card MCP with confirmation-scoping binding.
- **Phase 3:** CLI at `cli/`. commander-based. `agentpay confirm <intent>` as entry point.

## Hard rules

- Never edit files inside `.claude/` unless the user explicitly asks
- Do not add auth (Clerk) or DB (Supabase) until the phase that needs them
- No test framework yet — add Playwright in phase 2 if pitch requires it
- Confirmation-scoping binding must be cryptographic (EIP-712-style typed statement), not just UI-rendered
