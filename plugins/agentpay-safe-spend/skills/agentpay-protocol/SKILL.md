---
name: agentpay-protocol
description: Run AgentPay's propose, human-authorize, poll, execute, and receipt protocol through MCP or CLI after safe-spend policy approval. Use for purchases that need a wallet-bound confirmation and exact merchant/amount enforcement.
---

# AgentPay Protocol

Run the authorization lock only after `$safe-spend-policy` returns `ALLOW`. The policy skill governs what should be proposed; the AgentPay MCP is the security boundary for what may execute.

## Run The MCP Flow

1. Freeze the policy-lock record and recompare the selected candidate with it.
2. Call `propose_purchase` with the exact `merchant`, `amount_sgd`, and an appropriate `expiry_seconds`.
3. Show the returned confirmation URL to the user. State the product, merchant, quantity, currency, total, and expiry from the policy lock.
4. Wait for authorization in the user's wallet or managed signer. Never ask for a private key, seed phrase, or raw reusable payment signature.
5. Poll `get_confirmation` with the returned `request_id` at reasonable intervals until it is confirmed or expires.
6. Before execution, recompare the live candidate with the policy lock. Abort if any material field changed.
7. Call `execute_purchase` once with the opaque `confirmation_token` and the exact merchant and amount the user signed.
8. Call `get_receipt` with the returned receipt ID when present, then apply `$agentpay-outcome-attribution`.

Never reuse a capability, alter its fields, expose it to a merchant, or persist it in long-lived memory or logs. Treat it as a single-purpose bearer capability.

## Use The CLI Equivalents

Use the installed `agentpay` CLI when MCP tools are unavailable:

```bash
agentpay ping
agentpay propose --merchant "The Corner Store" --amount 6.50 --expiry 300
agentpay confirmation --request <request-id>
agentpay execute --token <sealed-capability> --merchant "The Corner Store" --amount 6.50
agentpay receipt --id <receipt-id>
```

Use `--endpoint <url>` only when intentionally testing another AgentPay deployment.

## Respect The Signed Boundary

The sealed confirmation binds request, merchant, amount, expiry, payer, rail, payment proof, payment hash, signer, and replay nonce according to the active funding mode. `execute_purchase` must receive the exact merchant and amount.

Today, product ID, quantity, and offer provenance are preserved and checked by policy but are not fields in the MCP execution schema. Never imply otherwise. Require a new proposal whenever these fields change, even if merchant and amount remain the same.

## Handle Uncertainty Safely

Do not automatically retry `execute_purchase` after a timeout, transport failure, or rail error because the nonce or payment may already have been consumed. Reconcile with `get_receipt` and the visible order state first. If the result remains unknown, report it as unresolved and ask the user before creating a fresh proposal.
