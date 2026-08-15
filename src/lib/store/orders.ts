// Store order tracking: bridges the store's own x402 checkout to the existing
// propose_purchase -> /confirm -> execute_purchase pipeline. The store never
// holds funds or a settlement wallet (SIG-021 anchor) - this record only
// tracks which product a requestId was for, and gates execute_purchase to
// run at most once per order so re-polling never double-mints.
//
// In-memory, same pattern as src/lib/confirmations.ts and src/lib/receipts.ts.

// "refused" = a signed Block Receipt (AgentPay's own Binding refused the
// mint - the S2 injection-block case). "rail_failed" = StraitsX declined
// settlement with no Block Receipt at all (e.g. insufficient sandbox
// balance - the S3 over-limit case). Keeping these distinct matters: they
// are attributed to different layers (SIG-018) and the UI must not show a
// rail failure as if it were AgentPay's own refusal.
export type StoreOrderStatus =
  | "awaiting_signature"
  | "settled"
  | "refused"
  | "rail_failed";

export type StoreOrder = {
  requestId: string;
  slug: string;
  merchant: string;
  amountSgd: number;
  createdAt: string;
  status: StoreOrderStatus;
  receiptId?: string;
  /** Only set for rail_failed - there is no receipt object to look up. */
  detail?: string;
};

const store = ((globalThis as Record<string, unknown>)
  .__agentpayStoreOrdersV1 ??= new Map<string, StoreOrder>()) as Map<
  string,
  StoreOrder
>;

export function createOrder(input: {
  requestId: string;
  slug: string;
  merchant: string;
  amountSgd: number;
}): StoreOrder {
  const order: StoreOrder = {
    ...input,
    createdAt: new Date().toISOString(),
    status: "awaiting_signature",
  };
  store.set(input.requestId, order);
  return order;
}

export function getOrder(requestId: string): StoreOrder | undefined {
  return store.get(requestId);
}

export function markOrderResolved(
  requestId: string,
  outcome:
    | { status: "settled" | "refused"; receiptId: string }
    | { status: "rail_failed"; detail: string },
): StoreOrder | undefined {
  const order = store.get(requestId);
  if (!order) return undefined;
  order.status = outcome.status;
  if (outcome.status === "rail_failed") {
    order.detail = outcome.detail;
  } else {
    order.receiptId = outcome.receiptId;
  }
  return order;
}
