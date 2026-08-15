# ARCHITECTURE — How AgentPay works

> One MCP server, one signature, one gate. The agent talks to AgentPay; AgentPay talks to
> StraitsX; StraitsX settles on Avalanche. The user's signature is the only key to money.
> Read CONTEXT.md first for the shared language.

## System overview

```
 USER (human)                        AI AGENT (untrusted)
   │                                    │
   │ opens /confirm URL,                │ MCP tools: ping ·
   │ signs Tuple (EIP-712,              │ propose_purchase ·
   │ MetaMask)                          │ execute_purchase
   ▼                                    ▼
 ┌──────────────────────────────────────────────────────┐
 │  AGENTPAY  (this repo — Next.js on Vercel)           │
 │                                                      │
 │  /confirm page ── makes Confirmation Token           │
 │  MCP server (HTTP /api/mcp + stdio) ── tool surface  │
 │  Binding lib ── decode token, recover signer,        │
 │                 check expiry, assert Tuple match     │
 │  Mint Gate ── match → mint · mismatch → REFUSE+diff  │
 │  x402 client ── pays the mint price in XSGD          │
 └──────────────┬───────────────────────────────────────┘
                │ POST issue_card → HTTP 402 → sign EIP-3009
                │ → retry with PAYMENT-SIGNATURE → card
                ▼
 ┌──────────────────────────────────────────────────────┐
 │  STRAITSX  card.straitsx.ai (the Rail)               │
 │  Facilitator 0x4B9E...7202 pulls XSGD on-chain,      │
 │  pays gas, mints funded virtual card (Visa rails)    │
 └──────────────┬───────────────────────────────────────┘
                ▼
 ┌──────────────────────────────────────────────────────┐
 │  AVALANCHE C-CHAIN MAINNET (chainId 43114)           │
 │  XSGD 0xb2F85B7Ab3C2B6f62DF06de6Ae7D09C010A5096E     │
 │  ~2s finality · public tx hash = the proof           │
 └──────────────────────────────────────────────────────┘
```

## The flow, step by step

1. Agent calls `propose_purchase({merchant, amount_sgd, expiry_seconds?})`.
   AgentPay returns a `/confirm?merchant=..&amount=..&expiry=..` URL. No money can move yet.
2. User opens the URL. The page shows the Tuple. The user connects a wallet and signs
   EIP-712 typed data: domain `AgentPay v1, chainId 43114`; message
   `{merchant: string, amountSgd: uint256 (cents), expiryTimestamp: uint256, nonce: bytes32}`.
3. The page emits a **Confirmation Token** (base64url of message + signature + signer).
   The user hands it to the agent (paste into chat). The token is not a secret —
   tampering breaks the signature.
4. Agent calls `execute_purchase({confirmation_token, merchant, amount_sgd})`.
   The Mint Gate: decode → recover signer → check expiry → assert merchant and amount
   match the signed values exactly.
   - **Mismatch → ⛔ MINT REFUSED** with a field-by-field diff. (Planned: emit a Block Receipt.)
   - **Match → mint** (phase 3b: stub returns authorization; phase 3c: real mint below).
5. (Phase 3c) AgentPay pays StraitsX by x402: POST `issue_card` → 402 challenge →
   sign EIP-3009 `transferWithAuthorization` for the exact amount → retry with
   `PAYMENT-SIGNATURE` header → card returned, XSGD pulled on-chain by the Facilitator.
6. Receipt chain: signed Tuple → settlement tx hash → card id. All three link one purchase.

## Verified StraitsX facts (live-tested 2026-08-15, see vault SIG-020)

| Fact | Value |
|---|---|
| Mint (sandbox) | `POST card.straitsx.ai/sandbox/cardapi/issue_card` — Fuji 43113 |
| **Mint (production)** | `POST card.straitsx.ai/production/cardapi/issue_card` — mainnet 43114 |
| Card read | `GET .../cardapi/view_card?card_opaque_id=..&settlement_tx=..` |
| MCP transport (unused by us) | `.../sandbox/sse`, `.../production/sse` (per-team passphrase via Dev Hub) |
| Auth | None. The x402 payment IS the auth. |
| Payment header | `PAYMENT-SIGNATURE`: base64 of `{x402Version, accepted: <accepts[0] echoed>, payload: {signature, authorization}}` — transports-v2 shape; v1 shape is rejected |
| Price = card value | Pay N XSGD → card funded with N SGD. Test: 1 XSGD → 1.00 SGD card |
| Settle order | Facilitator settles ON-CHAIN first, then returns the card |
| Card shape returned | Full PAN/EXP/CVV in `card_html`, `card_opaque_id`, `iframe_url` (short-lived JWT), `settlement_tx` |
| Card scope observed | Value + 3-YEAR expiry. **No merchant lock found. Scoping is (so far) OUR layer's job.** |

Working reference client: `scripts/mint-test.ts` (minted the real card).

## Trust boundaries — who may see what

| Data | Agent | User | Notes |
|---|---|---|---|
| Tuple, confirmation URL, Token | ✅ | ✅ | Token is tamper-evident, not secret |
| Mint result: authorized/refused + diff | ✅ | ✅ | The demo surface |
| Card PAN / CVV / `card_html` | ❌ NEVER | ✅ via `iframe_url` only | SIG-008 credential-theft rule |
| `card_opaque_id` | ❌ NEVER | ✅ | settlement_tx is public → opaque_id is the only secret protecting the card |
| Wallet private key | ❌ NEVER | ✅ | `.env`, gitignored; server-side signing only in phase 3c |

## Known gaps (open items — brainstorm list)

1. **Nonce replay.** `verify.ts` does not store used nonces. One Token can mint many cards
   until expiry. Need a used-nonce store (in-memory is enough for the demo).
2. **Signer identity.** Any wallet can sign a Confirmation. The Binding proves "a human
   signed this Tuple," not "the paying wallet signed it." Phase 3c option: require
   signer == the wallet that funds the EIP-3009 pull. One key, one custody, closed loop.
3. **Card scope gap.** The StraitsX card has no merchant lock that we have found, and a
   3-year expiry. Post-mint, scope enforcement is thinner than the pitch implies.
   Ask DevRel for `issue_card` body fields; if none exist, say it honestly:
   value-scoping is real (card holds only the confirmed amount), merchant-scoping is
   enforced pre-mint by the Binding.
4. **Charge path.** No demo merchant yet. Options: test charge via a payment processor
   sandbox, or narrate the charge. Ask DevRel.
5. **Block Receipt** not yet emitted on refusal. Cheap, high demo value (SIG-018).
6. **Detector + Harness** (SIG-019) not started. Strictly additive; cut-safe.

## Repo map

```
app/                 Next.js App Router
  page.tsx             landing (connect instructions)
  confirm/             the /confirm signing page (ConfirmClient.tsx = wallet + sign)
  api/mcp/route.ts     MCP over Streamable HTTP
src/mcp/setup.ts     buildAgentPayServer — tools defined once, both transports
src/mcp/server.ts    stdio transport entry (npm run mcp)
src/lib/binding/     schema.ts (EIP-712 types) · verify.ts (decode/recover/verify)
src/lib/mcp/tools/   ping · propose_purchase · execute_purchase (the Mint Gate)
src/cli/index.ts     commander CLI → npm @aisystemresources/agentpay
scripts/mint-test.ts proven x402 client (real mainnet mint)
```

## Infrastructure

- **Hosting:** Vercel. `main` → production (`agentpay-tan.vercel.app`), `feat/*` → previews.
- **MCP endpoints:** HTTP `https://agentpay-tan.vercel.app/api/mcp` · stdio `npm run mcp`.
- **CLI release:** npm Trusted Publisher (OIDC) via `.github/workflows/release.yml`;
  version bump on main auto-publishes with provenance.
- **Chain access:** public RPC `https://api.avax.network/ext/bc/C/rpc` (read + none needed
  for writes — the Facilitator sends the on-chain txs).
- **Wallet:** one funded self-custody wallet (MetaMask-exported key in `.env`, server-side
  use only, never committed, never shown to the agent).
- **Env vars:** see `.env.example`. Secrets: `WALLET_PRIVATE_KEY` (phase 3c),
  `STRAITSX_MCP_PASSPHRASE` (only if we ever use their SSE transport).

## Phase 3c plan (current)

1. Promote the x402 client from `scripts/mint-test.ts` into `src/lib/straitsx/client.ts`.
2. Call it from the Mint Gate after the Binding passes. **Direct HTTP — not the SSE MCP.**
   (Decision basis: proven live, no passphrase dependency, and the 402 dance is our
   x402-award story. The SSE MCP stays as fallback.)
3. Redact per the trust-boundary table: the agent gets `{authorized, amount_sgd,
   settlement_tx, snowtrace_url}` — never `card_html`, never `card_opaque_id`.
4. Emit the Block Receipt on refusal; log both receipts (mint + block) for the demo feed.
5. Add the used-nonce store.
