# ARCHITECTURE — How AgentPay works

> One MCP server, linked signatures, one gate. The agent talks to AgentPay; AgentPay talks to
> a payment rail; the user's exact authorization is the only key to money.
> Read CONTEXT.md first for the shared language.

## System overview

```
 USER (human)                        AI AGENT (untrusted)
   │                                    │
   │ opens /confirm URL,                │ MCP tools: ping ·
   │ signs payment + Confirmation       │ propose_purchase ·
   │ (EIP-712, wallet-neutral)          │ execute_purchase
   ▼                                    ▼
 ┌──────────────────────────────────────────────────────┐
 │  AGENTPAY  (this repo — Next.js on Vercel)           │
 │                                                      │
 │  /confirm page ── makes Confirmation Token           │
 │  MCP server (HTTP /api/mcp + stdio) ── tool surface  │
 │  Binding lib ── verify signer, payer, payment hash,  │
 │                 expiry, replay, and Tuple match      │
 │  Mint Gate ── match → mint · mismatch → REFUSE+diff  │
 │  Payment adapter ── StraitsX now; other rails later  │
 └──────────────┬───────────────────────────────────────┘
                │ POST issue_card → HTTP 402 → user signs EIP-3009
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
2. User opens the URL. In the default `user_wallet` mode, AgentPay validates the
   StraitsX 402 challenge, then the wallet signs the exact EIP-3009 payment authorization.
3. The wallet signs `AgentPay v2` over `{requestId, merchant, amountSgd,
   expiryTimestamp, nonce, paymentRail, payer, paymentAuthorizationHash}`. This links
   the purchase to the exact payment proof and prevents proof replacement.
4. The page sends the signed payload directly to AgentPay over HTTPS. AgentPay seals it
   with AES-256-GCM and returns an opaque **Confirmation Capability**. The agent may carry
   this capability but cannot extract or submit the reusable EIP-3009 payment signature.
5. Agent calls `execute_purchase({confirmation_token, merchant, amount_sgd})`.
   The Mint Gate verifies signer = payer, request, rail, payment hash, chain, XSGD asset,
   exact amount, recipient, expiry, and replay nonce before checking the Tuple.
   - **Mismatch → MINT REFUSED** with a field diff and Block Receipt.
   - **Match → submit the already signed payment proof**. No user key is on the server.
6. StraitsX settles on-chain and returns the card. Receipt chain: signed Tuple and
   payment proof → settlement transaction → card id.

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
| Tuple, confirmation URL, sealed capability | ✅ | ✅ | Opaque; opens only inside AgentPay |
| Raw payment proof / EIP-3009 signature | ❌ NEVER | ✅ | Browser posts directly to AgentPay for sealing |
| Mint result: authorized/refused + diff | ✅ | ✅ | The demo surface |
| Card PAN / CVV / `card_html` | ❌ NEVER | ✅ via `iframe_url` only | SIG-008 credential-theft rule |
| `card_opaque_id` | ❌ NEVER | ✅ | settlement_tx is public → opaque_id is the only secret protecting the card |
| User wallet private key | ❌ NEVER | ✅ | Remains in the user's wallet or managed signer |
| Platform payer key | ❌ NEVER | ❌ | Only exists in explicit `platform_wallet` demo mode |
| Receipt signer key | ❌ NEVER | ❌ | Separate service identity; production should use KMS/HSM |

## Known gaps (open items — brainstorm list)

1. **Durable state.** Confirmations, replay nonces, receipts, and card secrets are still
   process-local. Production needs atomic durable storage before meaningful funds are enabled.
2. **Smart-wallet payment compatibility.** AgentPay can optionally verify ERC-1271
   Confirmations, but the StraitsX EIP-3009 proof currently requires an ECDSA payer.
   Crossmint smart wallets need a dedicated rail path; MPC EOA wallets can use this path.
3. **Crossmint access.** The adapter boundary is ready, but Avalanche wallet support is
   not self-serve in Crossmint's current matrix. Do not add secrets until access is confirmed.
4. **Card scope gap.** The StraitsX card has no merchant lock that we have found, and a
   3-year expiry. Post-mint, scope enforcement is thinner than the pitch implies.
   Ask DevRel for `issue_card` body fields; if none exist, say it honestly:
   value-scoping is real (card holds only the confirmed amount), merchant-scoping is
   enforced pre-mint by the Binding.
5. **Charge path.** No demo merchant yet. Options: test charge via a payment processor
   sandbox, or narrate the charge. Ask DevRel.
6. **Detector + Harness** (SIG-019) not started. Strictly additive; cut-safe.

## Repo map

```
app/                 Next.js App Router
  page.tsx             landing (connect instructions)
  confirm/             the /confirm signing page (ConfirmClient.tsx = wallet + sign)
  api/payments/prepare validates 402 challenge and prepares user payment proof
  api/mcp/route.ts     MCP over Streamable HTTP
src/mcp/setup.ts     buildAgentPayServer — tools defined once, both transports
src/mcp/server.ts    stdio transport entry (npm run mcp)
src/lib/binding/     schema.ts (EIP-712 types) · verify.ts (decode/recover/verify)
src/lib/payments/    provider-neutral rail contract · EIP-3009 proof types
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
- **Wallet default:** each user supplies their own ECDSA payment authorization. No payer
  private key is stored by AgentPay.
- **Demo fallback:** `platform_wallet` requires a fixed owner and separate payer key.
- **Env vars:** see `.env.example`. Sandbox and `user_wallet` are the safe defaults.

## Payment adapter contract (current)

The Mint Gate depends on `PaymentRailAdapter`, not directly on a wallet brand. The live
adapter is StraitsX with two explicit funding modes. Injected EVM wallets are the first
authorization UI. Crossmint can be added as a wallet or payment adapter after credentials,
custody model, and Avalanche support are confirmed. AgentPay policy remains independent.
