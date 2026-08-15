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

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ?? "https://agentpay-tan.vercel.app";
  const params = new URLSearchParams({
    merchant,
    amount: String(amountSgd),
    expiry: String(expirySeconds),
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
          "The user will sign an EIP-712 typed data message binding (merchant, amount, expiry, nonce). After signing, they receive a base64 confirmation_token — ask them to paste it back into the chat.",
          "",
          "Once you have the token, call execute_purchase(confirmation_token=<token>, merchant, amount_sgd). AgentPay recovers the signer, verifies expiry, and asserts (merchant, amount) in your mint request match the signed values. Divergence → refuses the mint with a visible diff.",
        ].join("\n"),
      },
    ],
  };
}
