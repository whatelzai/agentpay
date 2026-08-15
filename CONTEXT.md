# CONTEXT — What AgentPay is

> AgentPay is the trust layer that lets AI agents spend safely. It closes the prompt-injection
> gap that the card layer alone cannot close. One line: **AgentPay blocks what the user never
> confirmed; StraitsX blocks what the user never allowed.**

Built at the StraitsX AgentiX Playground hackathon, Singapore, 14–16 August 2026. Track 2:
"Build the wallets, payment rails, policies, and protocols that let AI spend safely."

## The problem in three sentences

An AI agent that can pay can be hijacked. Hidden text on a web page, or a malicious peer agent,
can change what the agent tries to buy. A scoped card caps the damage — but it cannot stop the
instruction, because a card scoped to the *hijacked* purchase passes every card-layer check.

## The answer in three sentences

The user signs one exact purchase: merchant, amount, expiry. The signature — not the agent's
words — is the only thing that can unlock a card mint. If the agent asks for anything else,
the mint is refused, with a visible diff and a receipt of the block.

## North star and non-goals

- **North star (DEC-001, non-negotiable):** every build item must push toward SPEND SAFELY.
- **Focus (DEC-002):** prompt injection specifically. Three source categories:
  content-source / peer-agent / persistent-state.
- **Non-goals (DEC-002):** direct user injection, phishing, card-layer compromise.

## Ubiquitous language

Use these words, in code and in conversation. One meaning each.

| Term | Meaning |
|---|---|
| **Tuple** | The three values the user approves: (merchant, amount, expiry). Plus a nonce. |
| **Confirmation** | The EIP-712 typed-data signature over the Tuple. Made by the user's wallet on the `/confirm` page. |
| **Confirmation Token** | Base64url string that carries the Tuple + signature + signer address. Travels through the agent; tampering breaks the signature. |
| **Binding** | The rule that a mint request must match the signed Tuple exactly. The core of AgentPay. |
| **Mint Gate** | The `execute_purchase` tool (formerly `request_card_mint`). Verifies the Binding, then (phase 3c) calls StraitsX. |
| **Block Receipt** | Signed, logged record of a refused mint: requested vs confirmed, mismatch, REFUSED. (Planned.) |
| **Scope** | The limits carried by a minted card: value, expiry, (merchant lock — not yet found in the StraitsX card, see SIG-020). |
| **The Seam** | The bridge from a self-custody XSGD balance to a funded card: one EIP-3009 signature, facilitator pulls, card is funded. Proven live in SIG-020. |
| **Rail** | StraitsX card API + XSGD settlement on Avalanche C-Chain mainnet. |
| **Facilitator** | StraitsX's on-chain sender (`0x4B9E...7202`). Submits the XSGD pull and pays the gas. |
| **Walls** | The layered defenses: Detector (pre-confirmation, planned) → Binding (post-confirmation, live) → Card scope (rail). |
| **Detector** | Escalate-only injection screen. Can only ask for one more confirmation. Never approves, never blocks alone. (Planned; SIG-019.) |
| **Harness** | Replay rig that fires known injection payloads at the pipeline and counts unauthorized mints (target: zero). (Planned; SIG-019.) |

## The demo scenarios (SIG-018 + DEC-002)

1. **S1 — happy path.** Real purchase, one tap, seconds to done. Zero false positives.
2. **S2 — prompt injection, blocked by AgentPay.** Two variants per DEC-002:
   web-page injection and agent-to-agent injection. Star moment: the agent asks
   for a purchase the user never signed → automatic refusal with a diff. No human needed.
3. **S3 — over-limit, blocked by the rail.** No injection. The charge or pull fails at
   the StraitsX/card layer. Shows the wall below us holds too.

## Where the truth lives

- **This repo:** code, deployment, build. Plus two digest files:
  `STRAITSX-DOCS-DIGEST.md`, `AVALANCHE-PRIMARY-NETWORK-DIGEST.md`.
- **EMDEE vault** (`edmund/03-projects/05-agentpay/`): strategy, decisions, signals.
  Key reads: DEC-001 (north star), DEC-002 (injection focus), DEC-003 (layered stack),
  SIG-017 (8 properties of SAFE), SIG-018 (demo design), SIG-019 (detector + datasets),
  SIG-020 (live API probe + the real production mint).
- Do not duplicate strategy here. Reference it.

## Status (2026-08-15, night)

- Phases 1–3b shipped: landing page, MCP server (HTTP + stdio), CLI, EIP-712 Binding live.
- **Proven on mainnet:** 1 XSGD → real funded virtual card, on-chain settlement verified
  (SIG-020). The x402 client exists in `scripts/mint-test.ts`.
- Phase 3c (current): wire the Mint Gate to the real StraitsX mint.
- Wallet: one funded self-custody wallet (29 XSGD + gas). MetaMask + viem. No Crossmint.
