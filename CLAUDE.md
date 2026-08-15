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

## CLI release (npm publish)

Auto-publishes via `.github/workflows/release.yml` when any commit on main bumps `package.json .version`.

- Trigger: push to main + version change detected (HEAD vs HEAD~1)
- Uses npm Trusted Publisher (OIDC) — no `NPM_TOKEN` secret needed
- Publishes with `--provenance` for supply-chain attestation
- Tags `v$VERSION` after successful publish
- Workflow filename is pinned in npm Trusted Publisher config — do not rename

**One-time npm setup (already done? verify):**
1. Manual bootstrap publish: `npm publish --access public` (needs npm login as owner of `@aisystemresources` scope)
2. npmjs.com → package settings → Publishing access → Add Trusted Publisher → GitHub Actions → org: `whatelzai`, repo: `agentpay`, workflow filename: `release.yml`, environment: (leave blank)
3. After that, every version bump on main auto-publishes.

**To release:**
- In your PR, bump `package.json .version` (patch for bugfix, minor for new CLI verb/flag, major for breaking)
- Merge to main via the usual automerge flow
- Release workflow detects the bump, builds, publishes, tags

## Phases

- **Phase 1:** ✅ Vercel-deployed landing page. Shipped.
- **Phase 2:** ✅ MCP server (HTTP + stdio). Shipped.
- **Phase 3a:** ✅ CLI scaffold — `src/cli/index.ts` (commander), `bin/agentpay.mjs` (shebang wrapper), `scripts/build-cli.mjs` (esbuild bundle). Commands: `agentpay ping`, `agentpay confirm`, `agentpay mint`.
- **Phase 3b (current):** EIP-712 cryptographic signing on `/confirm` page. `src/lib/binding/{schema,verify}.ts` defines the typed data + verify utility (viem). `app/confirm/ConfirmClient.tsx` handles wallet connect + sign + token display. New `request_card_mint` MCP tool decodes the token, recovers the signer, verifies expiry, and refuses on (merchant, amount) mismatch with a visible diff. Actual StraitsX mint is stubbed — returns authorization result only.
- **Phase 3c:** Wire the mint stub to the live StraitsX card MCP at `card.straitsx.ai/production/sse`. Requires mcp-inspector session on the sandbox endpoint to capture the actual tool schema (per RES-001 v2 to-do).

## MCP endpoints

- **HTTP (production):** `https://agentpay-tan.vercel.app/api/mcp` — Streamable HTTP transport
- **stdio (local):** `npm run mcp` — for the AgentPay CLI (phase 3) or local dev
- Both share `buildAgentPayServer(ctx)` from `src/mcp/setup.ts` — tools defined once, exposed via both transports

**Consumer connect targets (documented on landing page):**
- **Claude.ai** (web + desktop, Pro/Max/Team/Enterprise) — Settings → Connectors → Add custom connector → paste HTTP URL
- **Codex app** — Plugins → MCPs → Add → Connect to a custom MCP → Type: Streamable HTTP + URL

**Not documented on landing page (deliberate):**
- Claude Code CLI — will use our own `@aisystemresources/agentpay` CLI in phase 3, not the raw HTTP endpoint
- Claude Desktop config-file variant — superseded by Claude.ai in-app connector UI

## Hard rules

- Never edit files inside `.claude/` unless the user explicitly asks
- Do not add auth (Clerk) or DB (Supabase) until the phase that needs them
- No test framework yet — add Playwright in phase 2 if pitch requires it
- Confirmation-scoping binding must be cryptographic (EIP-712-style typed statement), not just UI-rendered
