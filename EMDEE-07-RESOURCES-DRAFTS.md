# Drafts: AGENTPAY — 03-PRODUCTION — 07-RESOURCES children (REC-001…REC-008)

> **STATUS: SHIPPED 2026-08-15.** All docs below (REC-001…REC-008, plus REC-009 Avalanche Primary Network deep-digest) were written to the vault via `emdee create-child --remote --author desmond` after CLI v0.14.0 fixed the shared-path scope matching. Parent `07-RESOURCES.md` verified listing all nine. This file is kept as the local record of what was written.
>
> Original staging note (historical): create each doc via `create_child` with:
> `parent_path: __shared__/user_3FXDLXbkdJ2TSWM0tc8SYMql9ZO/edmund/03-projects/05-agentpay/03-production/07-RESOURCES.md`
> `child_path: __shared__/user_3FXDLXbkdJ2TSWM0tc8SYMql9ZO/edmund/03-projects/05-agentpay/03-production/07-resources/<FILENAME>`
> `gate_on_warnings: ["multiple_child_of", "associate_duplicates_hierarchy", "sibling_assoc_redundant"]`
> Run the five calls **sequentially** (each patches the same parent's `## Parent of`).
> Note: `07-RESOURCES.md` itself already exists (Edmund created it) — reuse it, do not recreate. Its notes say "no prefix required" for filenames; the REC-NNN prefix below is per Desmond's explicit request and doesn't conflict.
>
> Source Notion doc has (at least) two sections: **Developer Resources** (REC-001…005) and **Faucets** (REC-006…007). One unresolved link: the Faucets section's "Testing done via StraitsX API environment; host" — "host" is a Notion-internal link Edmund must resolve; placeholder flagged in REC-007.

---

## REC-001 — filename `REC-001-AVALANCHE-DEVELOPER-DOCS.md`

**Title:** `AGENTPAY — REC-001-AVALANCHE-DEVELOPER-DOCS`

**Summary (blockquote):**
Official Avalanche developer docs (Builder Hub) — C-Chain vs sovereign L1s, Avalanche Console, Interchain Messaging, explorer, node tooling. Reference for AgentPay's settlement rail: XSGD on Avalanche C-Chain mainnet.

**Body (after `## Notes`):**

**What:** Official Avalanche developer documentation ("Avalanche Builder Hub") — docs for building on the C-Chain and for deploying sovereign L1s.

**Where:** https://docs.avax.network/

**Why it matters:** AgentPay's settlement rail is XSGD on Avalanche C-Chain mainnet (build priority 1). This is the primary reference for the rail layer — C-Chain finality claims, tooling, and the L1/subnet model behind StraitsX's PBM deployment. Backs the rail thesis in [[AGENTPAY — SIG-010-AVALANCHE-RAIL-THESIS-SLIDES-1-TO-12]] and the ecosystem-depth claims in [[AGENTPAY — SIG-013-AVALANCHE-ECOSYSTEM-DEPTH-SLIDES-15-TO-19]].

**Key contents (read 2026-08-15):**

- Two build paths: **shared C-Chain** (permissionless EVM, sub-second finality, existing institutional infrastructure) vs **sovereign L1s** (custom VMs, gas tokens, validator sets; sub-100ms finality claimed).
- **Avalanche Console** — guided interface for configuring/deploying custom L1s.
- **Avalanche Explorer** — chains, validators, interchain messaging observation.
- **Interchain Messaging (ICM)** — native cross-chain communication without intermediaries; relevant to how the "XSGD by StraitsX L1" (Slide 14) relates to C-Chain XSGD.
- Compliance features (validator and transaction allowlisting) and a privacy spectrum from public to fully private networks.
- Institutional positioning: JPMorgan, Franklin Templeton, BlackRock; tokenized assets and state-issued stablecoin case studies — useful for pitch credibility.

---

## REC-002 — filename `REC-002-STRAITSX-XSGD-API-DOCS.md`

**Title:** `AGENTPAY — REC-002-STRAITSX-XSGD-API-DOCS`

**Summary (blockquote):**
StraitsX API docs — fiat + XSGD payments/payouts infrastructure: Customer Profiles, Payment (PayNow QR), Payout, Swap, Blockchain, and Transaction Limit APIs across First Party / Third Party / Regular Transfer integration models. Reference for the XSGD settlement rails.

**Body (after `## Notes`):**

**What:** StraitsX's API documentation — payments and payouts infrastructure for fiat and stablecoin (XSGD) transactions.

**Where:** https://docs.straitsx.com/docs — full machine-readable index at https://docs.straitsx.com/llms.txt

**Why it matters:** XSGD is AgentPay's settlement asset — "the only regulated Singapore dollar stablecoin an agent can hold today" ([[AGENTPAY — SIG-007-STRAITSX-SIX-STEP-LIFECYCLE-AND-SINGAPORE-LIVE-PROOF]]). These APIs are the funding/settlement layer beneath the card MCP; the Blockchain API (on-chain deposits/withdrawals) is the likely surface for the self-custody funding question in [[AGENTPAY — SIG-002-EXECUTION-SEAM-CARD-AUTH-TO-SELF-CUSTODY-DEBIT]]. See also [[AGENTPAY — SIG-012-XSGD-VIA-STRAITSX-L1-AND-PURPOSE-BOUND-MONEY]].

**Key contents (read 2026-08-15):**

- **Integration models:** First Party, Third Party, Regular Transfer — feature availability depends on approved use case and integration type.
- **Customer Profiles API** — end-user account management.
- **Payment API** — PayNow QR codes and bank transfers in.
- **Payout API** — fund disbursement to accounts.
- **Swap API** — exchanges between supported pairs.
- **Blockchain API** — on-chain deposits/withdrawals with fee estimation.
- **Transaction Limit API** — CP+ merchants only.
- Target integrators: crypto exchanges, fintech platforms, PSPs, marketplaces, corporate treasury — i.e. compliance-regulated flows.

---

## REC-003 — filename `REC-003-STRAITSX-CARD-MCP-SANDBOX.md`

**Title:** `AGENTPAY — REC-003-STRAITSX-CARD-MCP-SANDBOX`

**Summary (blockquote):**
StraitsX card-issuance MCP server, sandbox environment — live MCP endpoint over the HTTP+SSE transport. Probed 2026-08-15: returns a session-scoped `/sandbox/messages?sessionId=…` endpoint, open CORS, no connection-level auth.

**Body (after `## Notes`):**

**What:** The sandbox instance of StraitsX's card-issuing / one-time-card MCP server — the provided infrastructure AgentPay wraps rather than rebuilds ([[AGENTPAY — SIG-009-STRAITSX-BUILT-THE-CARD-MCP-WE-BUILD-ON-TOP]]).

**Where:** https://card.straitsx.ai/sandbox/sse (MCP over the HTTP+SSE transport)

**Why it matters:** This is the build-time integration target for AgentPay's MCP wrapper (build priority 4) — spend limits, merchant restrictions, full logging come from here. Sandbox pairs with the self-custody x402 flow documented in [[AGENTPAY — 03-PRODUCTION]]'s reference-infra section (HTTP 402 challenge → EIP-3009 `transferWithAuthorization` on Fuji XSGD).

**Probe results (curl, 2026-08-15):**

- HTTP 200, `Content-Type: text/event-stream`, server Apache.
- First SSE event is `endpoint` with a session-scoped path: `/sandbox/messages?sessionId=<uuid>` — the legacy MCP HTTP+SSE transport (GET opens the stream; JSON-RPC messages POST to the returned endpoint).
- `Access-Control-Allow-Origin: *`; no auth challenge at connection level (auth, if any, is at the message/tool layer).

---

## REC-004 — filename `REC-004-STRAITSX-CARD-MCP-PRODUCTION.md`

**Title:** `AGENTPAY — REC-004-STRAITSX-CARD-MCP-PRODUCTION`

**Summary (blockquote):**
StraitsX card-issuance MCP server, production environment — live MCP endpoint over the HTTP+SSE transport, confirming SIG-009's "production MCP is live" claim. Returns a session-scoped `/production/messages?sessionId=…` endpoint.

**Body (after `## Notes`):**

**What:** The production instance of StraitsX's card-issuing MCP server — the event-day / mainnet path.

**Where:** https://card.straitsx.ai/production/sse (MCP over the HTTP+SSE transport)

**Why it matters:** Partially answers the open DevRel question from [[AGENTPAY — SIG-009-STRAITSX-BUILT-THE-CARD-MCP-WE-BUILD-ON-TOP]] — "what is the production MCP endpoint URL?" — the endpoint is live and connectable today. Still to confirm Saturday: the auth model (per-team passphrase like the earlier `https://card.straitsx.ai/mcp` reference stack's `GATEWAY_PASSPHRASE`?), tool list, and whether it settles XSGD on Avalanche C-Chain mainnet or USDC on Base like the older custodial path ([[AGENTPAY — 03-PRODUCTION]] reference-infra section).

**Probe results (curl, 2026-08-15):**

- HTTP 200, `Content-Type: text/event-stream`, server Apache.
- First SSE event is `endpoint` with session-scoped path `/production/messages?sessionId=<uuid>` — same HTTP+SSE MCP transport as sandbox.
- `Access-Control-Allow-Origin: *`; no auth at connection level — auth presumably enforced at the tool-call layer.

---

## REC-005 — filename `REC-005-CROSSMINT-DEVELOPER-DOCS.md`

**Title:** `AGENTPAY — REC-005-CROSSMINT-DEVELOPER-DOCS`

**Summary (blockquote):**
Crossmint developer docs — wallets, stablecoin payment orchestration, tokenization, and agentic payments (autonomous agents holding funds and transacting via cards + stablecoins). Reference for the agentic-commerce layer AgentPay operates within.

**Body (after `## Notes`):**

**What:** Crossmint's developer documentation — "an all-in-one platform to integrate stablecoins and wallets on your product via simple compliant APIs."

**Where:** https://docs.crossmint.com/

**Why it matters:** Crossmint is part of the agentic-commerce stack live on Avalanche ([[AGENTPAY — SIG-011-AGENTIC-COMMERCE-STACK-LIVE-ON-AVALANCHE]]). Its **Agentic Payments** product — agents holding funds and transacting with cards and stablecoins — is the closest commercial analogue to what AgentPay builds on StraitsX rails; useful both as a wallet-infrastructure option and as competitive/positioning reference for the trust-binding differentiator.

**Key contents (read 2026-08-15):**

- **Wallets** — embedded wallets for applications, treasury wallet management.
- **Payments** — stablecoin orchestration, onramps, offramps, token checkout.
- **Tokenization** — minting and distributing tokens at scale.
- **Agentic Payments** — autonomous agents holding funds, transacting with cards and stablecoins.
- Fintech solution guides (remittances, neobanks, global payroll, stablecoin payouts) and n8n workflow automation for money movement.

---

## REC-006 — filename `REC-006-AVALANCHE-FUJI-TESTNET-FAUCET.md`

**Title:** `AGENTPAY — REC-006-AVALANCHE-FUJI-TESTNET-FAUCET`

**Summary (blockquote):**
Core (Ava Labs) testnet faucet for Fuji test AVAX — the gas source for the sandbox x402 flow's funded Fuji wallet. Fuji C-Chain: chain ID 43113 (0xA869). Alternative faucet lives in the Avalanche Builder Console.

**Body (after `## Notes`):**

**What:** Testnet faucet in Core (Ava Labs' wallet suite) dispensing test AVAX on Avalanche Fuji.

**Where:** https://core.app/tools/testnet-faucet — alternative: the Builder Console faucet at https://build.avax.network/console/primary-network/faucet

**Why it matters:** The StraitsX sandbox card flow requires a funded Fuji wallet ([[AGENTPAY — 03-PRODUCTION]] reference-infra section: `AGENT_PRIVATE_KEY` signing EIP-3009 on Fuji XSGD). The faucet covers the **AVAX gas** side of that wallet; the XSGD side has no public faucet (see [[AGENTPAY — REC-007-STRAITSX-SANDBOX-GETTING-STARTED]]).

**Key facts (read 2026-08-15):**

- Fuji C-Chain: chain ID **43113** (`0xA869`), public RPC via the Avalanche docs quick-start (build.avax.network → Fuji Testnet page).
- The core.app faucet page is a client-rendered app (not readable headlessly); expect a Core login and either a small mainnet AVAX balance or a coupon code to request test AVAX — hackathon organisers often distribute coupon codes, worth asking StraitsX/Avalanche DevRel Saturday.
- The Builder Console faucet (`/console/primary-network/faucet`) is the docs-linked alternative if core.app gates on mainnet balance.

---

## REC-007 — filename `REC-007-STRAITSX-SANDBOX-GETTING-STARTED.md`

**Title:** `AGENTPAY — REC-007-STRAITSX-SANDBOX-GETTING-STARTED`

**Summary (blockquote):**
StraitsX getting-started guide — business account signup, sandbox API keys, and environment hosts (api-sandbox.straitsx.com / api.straitsx.com). Matters because XSGD has NO public testnet faucet: test XSGD comes through the StraitsX sandbox API environment.

**Body (after `## Notes`):**

**What:** StraitsX's onboarding/getting-started guide for API access — the entry path to the sandbox environment that substitutes for a public XSGD faucet.

**Where:** https://docs.straitsx.com/docs/getting-started

**Why it matters:** Per the hackathon's Faucets note: **no public XSGD testnet faucet exists** — "testing done via StraitsX API environment." So the funded-Fuji-XSGD-wallet prerequisite in the sandbox x402 flow ([[AGENTPAY — 03-PRODUCTION]] reference-infra) is satisfied through this onboarding path, not a faucet. Pairs with [[AGENTPAY — REC-006-AVALANCHE-FUJI-TESTNET-FAUCET]] (gas) and [[AGENTPAY — REC-002-STRAITSX-XSGD-API-DOCS]] (the APIs themselves).

**Key contents (read 2026-08-15):**

- **Prerequisite:** StraitsX Business Account with admin/developer role.
- **Auth:** API keys (per-account, per-API), issued from the Sandbox Developer Tools page on account creation.
- **Hosts:** sandbox `api-sandbox.straitsx.com`, production `api.straitsx.com` (legacy `sandbox.xfers.io/api` / `xfers.io/api` still resolve but deprecated).
- **Onboarding sequence:** create business account → assign developer role → switch to sandbox → get sandbox keys → test Customer Profile API → configure callback URLs → test Payment/Payout APIs → production.
- **Test-XSGD path (confirmed from the full docs read, 2026-08-15 — see [[AGENTPAY — REC-008-STRAITSX-DOCS-DEEP-DIGEST]]):** sandbox top-up (`POST /sandbox/merchant/topup`) credits **fiat SGD only** → convert via Swap API `XSGDSGD` pair (or Cards Sub-Wallet `sgd→xsgd` 1:1) → `POST /sandbox/blockchain_transfer/addresses` + mock verification → blockchain-transfer-out with `wallet_source: XSGD`. No faucet exists.
- **Open items:** (1) the hackathon Notion's "host" link is a Notion-internal page — Edmund to resolve and paste the target URL here; (2) whether sandbox blockchain withdrawals actually broadcast on Fuji or are mock-settled — DevRel question for Saturday.

---

## REC-008 — filename `REC-008-STRAITSX-DOCS-DEEP-DIGEST.md`

**Title:** `AGENTPAY — REC-008-STRAITSX-DOCS-DEEP-DIGEST`

**Summary (blockquote):**
Full-tree digest of the StraitsX API docs (2026-08-15): XSGD-on-Avalanche confirmed live (xsgd_avax), test-XSGD sandbox path, Cards Sub-Wallet funding leg, auth + callback verification schemes, and the gaps the docs never answer. Full 2,000-line extraction lives in STRAITSX-DOCS-DIGEST.md at the agentpay repo root.

**Body (after `## Notes`):**

**What:** Full-tree digest of the StraitsX API docs (v1.6.0) — all 58 guide pages, key API-reference pages, and recent changelog entries, compiled 2026-08-15 by five parallel readers with per-fact source URLs. The local extraction that survives if the source changes. (Source-cited but not independently re-verified — the per-fact URLs are the audit trail.)

**Where:** Source https://docs.straitsx.com/docs (machine index: https://docs.straitsx.com/llms.txt). Full 2,000-line digest: `STRAITSX-DOCS-DIGEST.md` at the agentpay repo root.

**Why it matters:** This is the integration bible for the weekend — auth, rails, sandbox mechanics, and callbacks in one place. Key answers it settled for [[AGENTPAY — 03-PRODUCTION]]:

- **XSGD on Avalanche is live:** supported-blockchains API lists `xsgd_avax` enabled; blockchain callbacks tag the chain as `XSGD_AVAX`. Avalanche has the fastest confirmation time of StraitsX's chains (1–2 min).
- **Test XSGD (no faucet):** sandbox top-up is fiat-only → Swap `XSGDSGD` (or Cards Sub-Wallet `sgd→xsgd` 1:1) → sandbox blockchain address → transfer-out with `wallet_source`.
- **Cards Sub-Wallet:** `POST /sub-wallets/cards-settlement/transfers`, one-way, 1:1, idempotent — the card-funding leg.
- **Auth:** `X-XFERS-APP-API-KEY` on every call; hosts `api-sandbox.straitsx.com` / `api.straitsx.com`; optional Ed25519 request signing (±300s, UUID nonce).
- **Callbacks:** verify `Xfers-Signature` = HMAC-SHA256 hex over raw body (dashboard signing secret); blockchain events carry `transaction_hash` (may be literally `"pending"`) and `transaction_source` — the receipt/attribution fields for tying card auth to on-chain settlement.
- **Gaps the docs never state:** XSGD contract address, testnet name/chain-id, callback retry policy on the callback pages themselves (payment/payout guides say 20 retries at 5-min intervals), and whether sandbox withdrawals broadcast on Fuji. All four are DevRel questions.

**Digest contents:** Section A platform basics · B first/third-party models + CP vs CP+ · C money rails (Blockchain/Swap/FX/PayNow), supported chains, sandbox top-up, Cards Sub-Wallet, errors/idempotency · D all 13 callback pages field-by-field · E all 16 FAQ pages + 5 changelog releases (incl. the in-force Jan-2026 mandatory SWIFT validations) · F the complete llms.txt page index with every API-reference endpoint described.
