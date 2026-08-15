// Store order tracking: bridges the store's own x402 checkout to the existing
// propose_purchase -> /confirm -> execute_purchase pipeline. The store never
// holds funds or a settlement wallet (SIG-021 anchor) - this record only
// tracks which product a requestId was for, and gates execute_purchase to
// run at most once per order so re-polling never double-mints.
//
// In-memory, same pattern as src/lib/confirmations.ts and src/lib/receipts.ts.

export type StoreOrderStatus = "awaiting_signature" | "settled" | "refused";

export type StoreOrder = {
  requestId: string;
  slug: string;
  merchant: string;
  amountSgd: number;
  createdAt: string;
  status: StoreOrderStatus;
  receiptId?: string;
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
  status: "settled" | "refused",
  receiptId: string,
): StoreOrder | undefined {
  const order = store.get(requestId);
  if (!order) return undefined;
  order.status = status;
  order.receiptId = receiptId;
  return order;
}
