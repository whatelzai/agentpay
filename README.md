# AgentPay

The trust layer that makes AI spend safely.

Cryptographic confirmation binding for AI-agent payments — closes the prompt-injection gap that the card layer alone cannot. Cards handle credential theft. AgentPay handles the rest.

Built at the [StraitsX AgentiX Playground](https://straitsx.com), Singapore, 14–16 August 2026. Track: Agentic Payments Infrastructure.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript 5
- Tailwind CSS v4
- StraitsX card issuance over x402 + XSGD on Avalanche C-Chain
- Deployed on Vercel

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Before testing purchase proposals, create `.env.local` from `.env.example` and
set `CONFIRMATION_SEALING_KEY` to the output of `openssl rand -hex 32`.

## Wallet and funding modes

AgentPay separates the wallet that confirms a purchase, the wallet that funds
it, and the service key that signs Block Receipts.

- `user_wallet` is the safe default. Each user signs the exact AgentPay
  Confirmation and the linked StraitsX EIP-3009 payment authorization from
  their own wallet. AgentPay stores no user private key.
- `platform_wallet` is an explicit single-owner demo mode. It requires a fixed
  `DEMO_OWNER_ADDRESS` and a separate `STRAITSX_PAYER_PRIVATE_KEY`.
- `RECEIPT_SIGNER_PRIVATE_KEY` is independent from either payment model. Leave
  it unset for unsigned, degraded receipts during verification-only testing.
- `CONFIRMATION_SEALING_KEY` is a deployment-level AES key, not a user wallet
  key. It seals payment proofs before anything is handed to an agent. Generate
  it with `openssl rand -hex 32` and configure it only on the AgentPay server.

The current browser adapter uses any injected EVM wallet, including MetaMask,
Rabby, or Core. The signed protocol is provider-neutral. A Crossmint MPC or
payment adapter can implement the same boundary later; Crossmint smart-wallet
and Avalanche access must be confirmed before enabling it. See `.env.example`
for the exact Vercel settings. Sandbox is the default.

For the safe Vercel sandbox deployment, set:

```dotenv
NEXT_PUBLIC_BASE_URL=https://agentpay-tan.vercel.app
AGENTPAY_PAYMENT_RAIL=straitsx
AGENTPAY_FUNDING_MODE=user_wallet
STRAITSX_ENV=sandbox
AGENTPAY_DEMO_MODE=true
CONFIRMATION_SEALING_KEY=<output of openssl rand -hex 32>
```

Do not set `OWNER_ADDRESS`, `WALLET_PRIVATE_KEY`, or
`STRAITSX_PAYER_PRIVATE_KEY` in `user_wallet` mode.

`AGENTPAY_DEMO_MODE=true` enables the browser S1/S2/S3 arena only while
`STRAITSX_ENV=sandbox`. The endpoint fails closed outside sandbox. For a
cryptographically signed Block Receipt in the hackathon demo, configure a
separate throwaway `RECEIPT_SIGNER_PRIVATE_KEY`; it never funds a payment.
Supabase remains observability-only: it stores usage and KPI evidence, never
confirmation capabilities, payment proofs, card credentials, or spend authority.

## Scripts

- `npm run dev` — start dev server (Turbopack)
- `npm run build` — production build
- `npm run start` — serve production build
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript type check
- `npm run mcp` — run stdio MCP server locally
- `npm run cli:dev` — run CLI from source via tsx (fast iteration)
- `npm run build:cli` — bundle CLI to `dist/cli/index.mjs` via esbuild

## Release

CLI publishes to npm automatically when `package.json .version` bumps on `main`. Workflow: `.github/workflows/release.yml` — uses npm Trusted Publisher (OIDC), tags `v$VERSION` after publish. See CLAUDE.md for one-time npm setup.

## Codex plugin

The `agentpay-safe-spend` plugin packages the remote AgentPay MCP together
with the safe-spend policy and purchase protocol skills. From a clone of this
repository:

```bash
codex plugin marketplace add .
codex plugin add agentpay-safe-spend@agentpay-local
```

For a Git-backed install after this branch reaches `main`:

```bash
codex plugin marketplace add whatelzai/agentpay --ref main
codex plugin add agentpay-safe-spend@agentpay-local
```

Start a new Codex thread after installation so the MCP tools and skills are
loaded. The npm CLI below is the terminal interface to the same AgentPay MCP.

## CLI

```bash
# global install (once published)
npm install -g @aisystemresources/agentpay

# health check
agentpay ping

# propose a purchase — get a confirmation URL for the user to sign
agentpay propose --merchant "Starbucks" --amount 5.50

# poll after the user signs in their wallet
agentpay confirmation --request <request-id>

# execute the exact confirmed purchase against the opaque capability
agentpay execute --token <sealed-capability> --merchant "Starbucks" --amount 5.50

# point at a different MCP endpoint (defaults to prod)
agentpay ping --endpoint https://your-vercel-preview.vercel.app/api/mcp
```

Local dev without install: `./bin/agentpay.mjs <command>` after `npm run build:cli`.

## MCP endpoints

- **HTTP:** `https://agentpay-tan.vercel.app/api/mcp` (Streamable HTTP transport)
- **stdio:** `npm run mcp` (for the AgentPay CLI in phase 3, or local dev)

Consumer connect targets (documented on the landing page): **Claude.ai** (in-app Connectors UI) and **Codex app** (Plugins → MCPs → custom MCP). Claude Code CLI users get a native `@aisystemresources/agentpay` package in phase 3.

## Branches

- `main` → production (auto-deploys to Vercel)
- `feat/*` → preview (auto-deploys per branch)

## Phases

- **Phase 1:** ✅ Landing page.
- **Phase 2:** ✅ MCP server (HTTP + stdio).
- **Phase 3a:** ✅ CLI scaffold with commander + esbuild bundle.
- **Phase 3b:** ✅ Cryptographic EIP-712 confirmation signing on `/confirm` page + the Mint Gate (verify, then stub).
- **Phase 3c:** Tool surface renamed to `propose_purchase` / `execute_purchase`; real StraitsX mint via x402 behind the Binding.
- **Phase 3d (current):** Wallet-neutral payment boundary; request-bound v2 Confirmations; sealed agent-facing capabilities; user-funded StraitsX authorization; separate receipt signer; fixed-owner platform demo retained as an explicit fallback.

## Process

Process, decisions, signals, and research live in the EMDEE vault under `edmund/03-projects/05-agentpay/`. This repo is code only.
