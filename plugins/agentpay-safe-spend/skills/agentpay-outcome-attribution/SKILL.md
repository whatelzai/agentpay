---
name: agentpay-outcome-attribution
description: Classify and explain AgentPay purchase outcomes using policy decisions, Block Receipts, rail responses, and settlement receipts. Use after a refused proposal or execution attempt, and whenever a demo or operator must distinguish AgentPay protection from StraitsX settlement behavior.
---

# AgentPay Outcome Attribution

Attribute every final result to the layer that produced it. Never present a rail decline as an AgentPay prompt-injection block, or a policy refusal as a StraitsX decision.

## Use Canonical Final Labels

Use exactly one label when evidence establishes a final outcome:

| Label | Evidence | Meaning |
| --- | --- | --- |
| `AgentPay policy refused` | The pre-confirmation policy returned `REFUSE`; no proposal or rail call occurred. | Discovery or intent was unsafe before authorization. |
| `AgentPay protocol refused; StraitsX not called` | `execute_purchase` returned a Block Receipt for a binding, signature, expiry, payer, rail, or replay failure. | The hard execution gate rejected the request. |
| `AgentPay allowed; StraitsX declined` | Policy and protocol allowed the signed tuple, but the rail returned no settlement receipt, such as for insufficient sandbox XSGD. | Intent was authorized, but settlement failed. |
| `AgentPay allowed; StraitsX settled` | A successful receipt contains the mint or settlement proof chain. | Both authorization and settlement succeeded. |

Keep `pending` and `unknown; do not retry` as non-final states. Do not force an uncertain transport result into one of the four labels.

## Gather Evidence

1. Record the policy decision and reason codes.
2. Inspect the `execute_purchase` result without relying on HTTP status alone.
3. If a receipt ID is present, call `get_receipt` for the proof chain or Block Receipt.
4. Distinguish a Block Receipt from a plain rail failure with no receipt.
5. Record request ID, receipt ID, merchant, amount, payer, rail, timestamps, and settlement link when returned. Never record card credentials or private signing material.

A timeout or dropped response can occur after state changes. Reconcile before retrying. If reconciliation is impossible, use `unknown; do not retry` and require explicit user action for a new proposal.

## Explain Demo Scenarios

Use these expected outcomes for the sandbox demonstration:

- Clean product with Zhihao's funded 30 XSGD wallet: `AgentPay allowed; StraitsX settled`.
- Malicious product with Zhihao's funded wallet: `AgentPay policy refused` before StraitsX.
- Clean product with Edmund's 0 XSGD wallet: `AgentPay allowed; StraitsX declined`.

The funded malicious case proves the refusal is caused by AgentPay policy rather than insufficient funds. Report the actual observed evidence if a test differs from the expected outcome.
