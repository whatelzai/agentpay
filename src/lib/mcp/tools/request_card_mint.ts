import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolContext } from "./types";
import { decodeToken, verifyConfirmation } from "../../binding/verify";

export async function requestCardMint(
  _ctx: ToolContext,
  args: Record<string, unknown>,
): Promise<CallToolResult> {
  const confirmationToken =
    typeof args.confirmation_token === "string"
      ? args.confirmation_token
      : undefined;
  const merchant = typeof args.merchant === "string" ? args.merchant : undefined;
  const amountSgd =
    typeof args.amount_sgd === "number" ? args.amount_sgd : undefined;

  if (!confirmationToken || !merchant || amountSgd === undefined) {
    return {
      content: [
        {
          type: "text",
          text: "Error: confirmation_token (string), merchant (string), and amount_sgd (number) are all required.",
        },
      ],
      isError: true,
    };
  }

  let decoded;
  try {
    decoded = decodeToken(confirmationToken);
  } catch (e) {
    return {
      content: [
        {
          type: "text",
          text: `Error: confirmation_token could not be decoded — ${(e as Error).message}`,
        },
      ],
      isError: true,
    };
  }

  const verification = await verifyConfirmation(decoded);
  if (!verification.valid) {
    return {
      content: [
        {
          type: "text",
          text: `⛔ MINT REFUSED — signature verification failed: ${verification.reason}`,
        },
      ],
      isError: true,
    };
  }

  // THE critical check: does the agent's mint request match what the user signed?
  const requestedAmountCents = BigInt(Math.round(amountSgd * 100));
  const merchantMatches =
    decoded.merchant.toLowerCase() === merchant.toLowerCase();
  const amountMatches = decoded.amountSgd === requestedAmountCents;

  if (!merchantMatches || !amountMatches) {
    const diff: string[] = [];
    if (!merchantMatches) {
      diff.push(
        `  merchant: agent asked "${merchant}", user confirmed "${decoded.merchant}"`,
      );
    }
    if (!amountMatches) {
      diff.push(
        `  amount:   agent asked SGD ${amountSgd.toFixed(2)}, user confirmed SGD ${(Number(decoded.amountSgd) / 100).toFixed(2)}`,
      );
    }

    return {
      content: [
        {
          type: "text",
          text: [
            "⛔ MINT REFUSED — agent request diverges from user signature:",
            "",
            ...diff,
            "",
            `Signer: ${verification.recoveredAddress}`,
            `Signed at: ${new Date().toISOString()}`,
            "",
            "This is prompt-injection defence in action. The user cryptographically signed one purchase; the agent asked for a different one. AgentPay refuses to mint. Money does not move.",
          ].join("\n"),
        },
      ],
      isError: true,
    };
  }

  // Match. In phase 3c this proxies to card.straitsx.ai/production/sse for a real card mint.
  return {
    content: [
      {
        type: "text",
        text: [
          "✓ MINT AUTHORIZED — signature verified, request matches user confirmation.",
          "",
          `  signer:   ${verification.recoveredAddress}`,
          `  merchant: ${decoded.merchant}`,
          `  amount:   SGD ${(Number(decoded.amountSgd) / 100).toFixed(2)}`,
          `  expires:  ${new Date(Number(decoded.expiryTimestamp) * 1000).toISOString()}`,
          "",
          "[Phase 3b stub: actual StraitsX card mint via card.straitsx.ai/production/sse ships in phase 3c. Verification layer is live.]",
        ].join("\n"),
      },
    ],
  };
}
