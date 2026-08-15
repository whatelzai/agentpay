import { randomBytes } from "node:crypto";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolContext } from "./types";

export async function proposePurchase(
  _ctx: ToolContext,
  args: Record<string, unknown>,
): Promise<CallToolResult> {
  const merchant = typeof args.merchant === "string" ? args.merchant : undefined;
  const amountSgd =
    typeof args.amount_sgd === "number" ? args.amount_sgd : undefined;
  const expirySeconds =
    typeof args.expiry_seconds === "number" ? args.expiry_seconds : 300;

  if (!merchant || amountSgd === undefined) {
    return {
      content: [
        {
          type: "text",
          text: "Error: merchant (string) and amount_sgd (number) are required.",
        },
      ],
      isError: true,
    };
  }

  const requestId = `req_${randomBytes(8).toString("hex")}`;
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ?? "https://agentpay-tan.vercel.app";
  const params = new URLSearchParams({
    merchant,
    amount: String(amountSgd),
    expiry: String(expirySeconds),
    rid: requestId,
  });
  const confirmationUrl = `${baseUrl}/confirm?${params.toString()}`;

  return {
    content: [
      {
        type: "text",
        text: [
          "Send the user this confirmation URL to sign:",
          "",
          confirmationUrl,
          "",
          `request_id: ${requestId}`,
          "",
          "The user will sign an EIP-712 typed data message binding (merchant, amount, expiry, nonce). The signed confirmation_token is delivered back to AgentPay automatically.",
          "",
          `After the user signs, poll get_confirmation(request_id="${requestId}") every few seconds to collect the token. Fallback: the user can also copy the token from the page and paste it into the chat.`,
          "",
          "Then call execute_purchase(confirmation_token=<token>, merchant, amount_sgd). AgentPay recovers the signer, verifies expiry, and asserts (merchant, amount) in your mint request match the signed values. Divergence → refuses the mint with a visible diff.",
        ].join("\n"),
      },
    ],
  };
}
