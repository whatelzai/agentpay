import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import { ping, confirmPurchase } from "../lib/mcp/tools/index";
import type { ToolContext } from "../lib/mcp/tools/types";
import pkg from "../../package.json";

export const AGENTPAY_INSTRUCTIONS = `AgentPay is the trust layer for AI-agent payments. It closes the prompt-injection gap that the card layer alone cannot.

Flow:
1. Agent calls confirm_purchase({merchant, amount_sgd}) → returns a URL for the user to open and sign.
2. User signs the (merchant, amount, expiry) tuple in the browser — produces a cryptographic confirmation_token.
3. Agent calls request_card_mint(confirmation_token, merchant, amount) — AgentPay verifies (merchant, amount) in the mint request match the signed token. Mismatch → refuses.

Result: even if the agent's context is prompt-injected between confirmation and mint (from a web page, another agent, a tool response, or corrupted memory), the money can only move where the human signed.

Phase 2 scaffold — request_card_mint tool ships in phase 3, wired to the live StraitsX card MCP at card.straitsx.ai/production/sse. Deployed at agentpay-tan.vercel.app.`;

export const AGENTPAY_TOOLS = [
  {
    name: "ping",
    description:
      "Health check — confirms AgentPay MCP server is reachable and returns version and transport mode.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "confirm_purchase",
    description:
      "Request user confirmation for a purchase. Returns a URL for the user to open and sign. The signed confirmation token gates the eventual card mint — prompt injection cannot redirect the money after signature.",
    inputSchema: {
      type: "object" as const,
      properties: {
        merchant: {
          type: "string",
          description:
            "The merchant to purchase from (name, domain, or verified merchant identifier).",
        },
        amount_sgd: {
          type: "number",
          description: "Amount in SGD.",
        },
        expiry_seconds: {
          type: "number",
          description:
            "How long the confirmation stays valid. Default 300 (5 minutes).",
        },
      },
      required: ["merchant", "amount_sgd"],
    },
  },
];

export function buildAgentPayServer(ctx: ToolContext): Server {
  const server = new Server(
    { name: "agentpay", version: pkg.version },
    {
      capabilities: { tools: {} },
      instructions: AGENTPAY_INSTRUCTIONS,
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: AGENTPAY_TOOLS,
  }));

  server.setRequestHandler(
    CallToolRequestSchema,
    async (req): Promise<CallToolResult> => {
      const { name, arguments: args } = req.params;
      const a = args ?? {};
      switch (name) {
        case "ping":
          return await ping(ctx);
        case "confirm_purchase":
          return await confirmPurchase(ctx, a);
        default:
          throw new Error(`unknown tool: ${name}`);
      }
    },
  );

  return server;
}
