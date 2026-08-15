// Classifies an execute_purchase CallToolResult into the outcome the store
// needs to persist. Kept separate from the order route so it's independently
// testable without a live wallet signature or StraitsX call.
//
// execute_purchase.ts only ever produces two shapes of failure text:
//   - Binding-level refusal (Tuple mismatch, replay, bad signature, ...):
//     always includes "Block Receipt <id>" - AgentPay's own signed record
//     (SIG-018: "AgentPay blocks what the user never confirmed").
//   - Rail-level failure (StraitsX declines the mint, e.g. insufficient
//     sandbox balance): no receipt at all - just a plain refusal message
//     (SIG-018: "StraitsX blocks what the user never allowed"). The
//     confirmation's nonce may already be consumed here; execute_purchase's
//     own message tells the human what to do next.
// The success path always ends with a "receipt: <id>" line.

const RECEIPT_ID_PATTERN = /(?:receipt|Block Receipt):?\s+(rcpt_[0-9a-f]+)/i;

export type ExecutionOutcome =
  | { kind: "settled"; receiptId: string }
  | { kind: "block_receipt"; receiptId: string }
  | { kind: "rail_failed"; detail: string };

export function classifyExecutionResult(
  isError: boolean | undefined,
  text: string,
): ExecutionOutcome {
  const receiptId = text.match(RECEIPT_ID_PATTERN)?.[1];
  if (receiptId) {
    return isError
      ? { kind: "block_receipt", receiptId }
      : { kind: "settled", receiptId };
  }
  return { kind: "rail_failed", detail: text };
}
