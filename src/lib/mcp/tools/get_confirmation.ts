import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolContext } from "./types";
import { getConfirmation, isRequestId } from "../../confirmations";

export async function getConfirmationTool(
  _ctx: ToolContext,
  args: Record<string, unknown>,
): Promise<CallToolResult> {
  const requestId =
    typeof args.request_id === "string" ? args.request_id : undefined;
  if (!requestId || !isRequestId(requestId)) {
    return {
      content: [
        {
          type: "text",
          text: "Error: request_id (string, req_…) is required — propose_purchase returns it.",
        },
      ],
      isError: true,
    };
  }

  // Same-process store first (HTTP mode on the signing deployment), then the
  // deployed store over HTTP (stdio/CLI mode runs in a separate process).
  let token = getConfirmation(requestId);
  if (!token) {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ?? "https://agentpay-tan.vercel.app";
    try {
      const r = await fetch(`${baseUrl}/api/confirmations/${requestId}`);
      const body = (await r.json()) as { status?: string; token?: string };
      if (r.ok && body.status === "confirmed" && typeof body.token === "string") {
        token = body.token;
      }
    } catch {
      // treat as pending; the poll advice below covers transient failures
    }
  }

  if (!token) {
    return {
      content: [
        {
          type: "text",
          text: `Confirmation ${requestId} is still pending — the user has not signed yet. Poll get_confirmation again in a few seconds, or ask the user to paste the token manually if they already signed.`,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: [
          `✓ Confirmation ${requestId} is signed.`,
          "",
          `confirmation_token: ${token}`,
          "",
          "Call execute_purchase(confirmation_token=<the token above>, merchant, amount_sgd) with EXACTLY the merchant and amount the user confirmed.",
        ].join("\n"),
      },
    ],
  };
}
