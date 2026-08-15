import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolContext } from "./types";

export async function confirmPurchase(
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
          "Once the user signs, present the returned confirmation_token to the request_card_mint tool. AgentPay verifies (merchant, amount) in the mint request cryptographically match the signed token — prompt injection between signature and mint cannot hijack the purchase.",
          "",
          "[Phase 2 stub: the signed EIP-712 confirmation binding + request_card_mint tool ship in phase 3, wired to the live StraitsX card MCP.]",
        ].join("\n"),
      },
    ],
  };
}
