import { randomBytes } from "node:crypto";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolContext } from "./types";
import { configuredPaymentRail } from "../../payments/adapter";
import {
  isSupportedCardAmount,
  sgdToCents,
} from "../../payments/amount";
import { confirmationSealingConfigured } from "../../signing/confirmation_seal";

export async function proposePurchase(
  ctx: ToolContext,
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

  const amountCents = sgdToCents(amountSgd);
  if (amountCents === null || !isSupportedCardAmount(amountCents)) {
    return {
      content: [
        {
          type: "text",
          text: "Error: amount_sgd must use whole cents and be within the 5-50 SGD card range.",
        },
      ],
      isError: true,
    };
  }
  if (
    !Number.isInteger(expirySeconds) ||
    expirySeconds < 30 ||
    expirySeconds > 300
  ) {
    return {
      content: [
        {
          type: "text",
          text: "Error: expiry_seconds must be a whole number from 30 to 300.",
        },
      ],
      isError: true,
    };
  }
  if (!confirmationSealingConfigured()) {
    return {
      content: [
        {
          type: "text",
          text: "Error: AgentPay confirmation sealing is not configured; refusing to collect a payment signature.",
        },
      ],
      isError: true,
    };
  }

  let rail;
  try {
    rail = configuredPaymentRail();
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${(error as Error).message}` }],
      isError: true,
    };
  }

  const requestId = `req_${randomBytes(8).toString("hex")}`;
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ??
    ctx.baseUrl ??
    "https://agentpay-tan.vercel.app";
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
          rail.fundingMode === "user_wallet"
            ? "The user connects their own wallet and signs two linked EIP-712 messages: the exact XSGD payment authorization, then the AgentPay Confirmation over request, merchant, amount, expiry, payer, rail, and payment hash. AgentPay never receives a private key."
            : "This deployment uses the platform-funded demo mode. The registered demo owner signs the exact purchase Tuple; the shared payer remains fixed and cannot be authorized by arbitrary wallets.",
          "",
          `After the user signs, poll get_confirmation(request_id="${requestId}") every few seconds to collect the sealed capability. The user can also copy that opaque capability from the page.`,
          "",
          "Then call execute_purchase(confirmation_token=<token>, merchant, amount_sgd). AgentPay recovers the signer, verifies expiry, and asserts (merchant, amount) in your mint request match the signed values. Divergence → refuses the mint with a visible diff.",
        ].join("\n"),
      },
    ],
  };
}
