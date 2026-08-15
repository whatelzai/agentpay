import { NextResponse } from "next/server";
import { getOrder, markOrderResolved } from "@/src/lib/store/orders";
import { getConfirmation } from "@/src/lib/confirmations";
import { executePurchase } from "@/src/lib/mcp/tools/execute_purchase";
import { getReceipt } from "@/src/lib/receipts";

type Params = Promise<{ requestId: string }>;

export async function GET(_request: Request, { params }: { params: Params }) {
  const { requestId } = await params;
  const order = getOrder(requestId);
  if (!order) {
    return NextResponse.json({ error: "unknown order" }, { status: 404 });
  }

  if (order.status !== "awaiting_signature") {
    return NextResponse.json({
      status: order.status,
      order,
      receipt: order.receiptId ? getReceipt(order.receiptId) : undefined,
    });
  }

  const sealedCapability = getConfirmation(requestId);
  if (!sealedCapability) {
    return NextResponse.json({ status: "awaiting_signature", order });
  }

  // The order record gates this to a single attempt: once resolved, later
  // polls short-circuit above instead of re-running execute_purchase (whose
  // own nonce-claim is the security backstop, not the UX path).
  const result = await executePurchase(
    { mode: "http" },
    {
      confirmation_token: sealedCapability,
      merchant: order.merchant,
      amount_sgd: order.amountSgd,
    },
  );

  const resolvedStatus = result.isError ? "refused" : "settled";
  const text = result.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("\n");
  const receiptIdMatch = text.match(/(?:receipt|Block Receipt)\s+(rcpt_[0-9a-f]+)/i);
  const receiptId = receiptIdMatch?.[1];

  if (receiptId) {
    markOrderResolved(requestId, resolvedStatus, receiptId);
  }

  return NextResponse.json({
    status: resolvedStatus,
    order: getOrder(requestId),
    receipt: receiptId ? getReceipt(receiptId) : undefined,
    detail: text,
  });
}
