import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolContext } from "./types";
import { getReceipt, latestReceipt, type Receipt } from "../../receipts";

// The proof chain, agent- and human-readable. Receipts hold no card
// credentials by construction (see src/lib/card_vault.ts), so the whole
// record is safe to show.
function renderReceipt(r: Receipt): string {
  if (r.type === "MINTED") {
    return [
      `Receipt ${r.id} — MINTED ${r.timestamp}`,
      "",
      "Proof chain (one purchase, three links):",
      `  1. Signed Tuple:   merchant "${r.tuple.merchant}", SGD ${(Number(r.tuple.amountSgdCents) / 100).toFixed(2)}, nonce ${r.tuple.nonce.slice(0, 10)}…`,
      `     signed by:      ${r.signer}`,
      `  2. Settlement tx:  ${r.settlementTx}`,
      `  3. Public proof:   ${r.snowtraceUrl}`,
      "",
      `Card funded with SGD ${r.amountSgd}. Exactly the confirmed amount moved on-chain; the settlement transaction is publicly verifiable.`,
    ].join("\n");
  }
  return [
    `Receipt ${r.id} — REFUSED ${r.timestamp}`,
    "",
    `  reason:    ${r.reason}`,
    `  requested: merchant "${r.requested.merchant}", SGD ${(Number(r.requested.amountSgdCents) / 100).toFixed(2)}`,
    `  confirmed: merchant "${r.confirmed.merchant}", SGD ${(Number(r.confirmed.amountSgdCents) / 100).toFixed(2)}`,
    ...(r.signature
      ? [
          `  signature: ${r.signature}`,
          `  signed by: ${r.signedBy} (EIP-712 BlockReceipt, verifiable)`,
        ]
      : ["  signature: none — receipt signer not configured (degraded record)"]),
    "",
    "This Block Receipt is the audit trail of a refused mint. Money did not move.",
  ].join("\n");
}

export async function getReceiptTool(
  _ctx: ToolContext,
  args: Record<string, unknown>,
): Promise<CallToolResult> {
  const receiptId =
    typeof args.receipt_id === "string" ? args.receipt_id : undefined;
  const receipt = receiptId ? getReceipt(receiptId) : latestReceipt();

  if (!receipt) {
    return {
      content: [
        {
          type: "text",
          text: receiptId
            ? `No receipt found with id ${receiptId}. Note: receipts live in server memory — they do not survive a server restart.`
            : "No receipts yet. Receipts are created when execute_purchase mints or refuses.",
        },
      ],
      isError: true,
    };
  }

  return { content: [{ type: "text", text: renderReceipt(receipt) }] };
}
