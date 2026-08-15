import { NextResponse } from "next/server";
import { getOrder, markOrderResolved } from "@/src/lib/store/orders";
import { getConfirmation } from "@/src/lib/confirmations";
import { executePurchase } from "@/src/lib/mcp/tools/execute_purchase";
import { getReceipt } from "@/src/lib/receipts";
import { classifyExecutionResult } from "@/src/lib/store/classify_execution";

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
      detail: order.detail,
    });
  }

  const sealedCapability = getConfirmation(requestId);
  if (!sealedCapability) {
    return NextResponse.json({ status: "awaiting_signature", order });
  }

  // The order record gates this to a single attempt: once resolved, later
  // polls short-circuit above instead of re-running execute_purchase. This
  // matters even more for a rail failure than a settlement - execute_purchase
  // may have already consumed the nonce, so a second attempt would surface as
  // a *different* Block Receipt ("nonce already used") that has nothing to do
  // with the real S3 failure (insufficient sandbox balance).
  const result = await executePurchase(
    { mode: "http" },
    {
      confirmation_token: sealedCapability,
      merchant: order.merchant,
      amount_sgd: order.amountSgd,
    },
  );
  const text = result.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("\n");
  const outcome = classifyExecutionResult(result.isError, text);

  switch (outcome.kind) {
    case "settled":
      markOrderResolved(requestId, { status: "settled", receiptId: outcome.receiptId });
      return NextResponse.json({
        status: "settled",
        order: getOrder(requestId),
        receipt: getReceipt(outcome.receiptId),
      });
    case "block_receipt":
      markOrderResolved(requestId, { status: "refused", receiptId: outcome.receiptId });
      return NextResponse.json({
        status: "refused",
        order: getOrder(requestId),
        receipt: getReceipt(outcome.receiptId),
      });
    case "rail_failed":
      markOrderResolved(requestId, { status: "rail_failed", detail: outcome.detail });
      return NextResponse.json({
        status: "rail_failed",
        order: getOrder(requestId),
        detail: outcome.detail,
      });
  }
}
