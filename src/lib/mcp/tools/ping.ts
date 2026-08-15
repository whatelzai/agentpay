import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolContext } from "./types";
import pkg from "../../../../package.json";
import { configuredPaymentRail } from "../../payments/adapter";
import { confirmationSealingConfigured } from "../../signing/confirmation_seal";

export async function ping(ctx: ToolContext): Promise<CallToolResult> {
  let payment = "unavailable";
  try {
    const rail = configuredPaymentRail();
    payment = `${rail.id}/${rail.fundingMode}`;
  } catch (error) {
    payment = `misconfigured (${(error as Error).message})`;
  }
  return {
    content: [
      {
        type: "text",
        text: `AgentPay MCP server is live. Version ${pkg.version}. Transport: ${ctx.mode}. Payment: ${payment}. Confirmation seal: ${confirmationSealingConfigured() ? "configured" : "MISSING (purchase proposals fail closed)"}.`,
      },
    ],
  };
}
