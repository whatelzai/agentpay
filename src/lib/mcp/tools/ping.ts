import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolContext } from "./types.js";
import pkg from "../../../../package.json" with { type: "json" };

export async function ping(ctx: ToolContext): Promise<CallToolResult> {
  return {
    content: [
      {
        type: "text",
        text: `AgentPay MCP server is live. Version ${pkg.version}. Transport: ${ctx.mode}.`,
      },
    ],
  };
}
