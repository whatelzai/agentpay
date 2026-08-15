import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import { ping, confirmPurchase, requestCardMint } from "../lib/mcp/tools/index";
import type { ToolContext } from "../lib/mcp/tools/types";
import pkg from "../../package.json";

export const AGENTPAY_INSTRUCTIONS = `AgentPay is the trust layer for AI-agent payments. It closes the prompt-injection gap that the card layer alone cannot.

Flow:
1. Agent calls confirm_purchase({merchant, amount_sgd}) → returns a URL for the user to open and sign.
2. User signs the (merchant, amount, expiry, nonce) tuple in the browser via EIP-712 typed data — produces a base64-encoded confirmation_token containing the signature.
3. Agent calls request_card_mint(confirmation_token, merchant, amount) — AgentPay decodes the token, recovers the signer, verifies expiry, and asserts (merchant, amount) in the mint request match the signed values. Mismatch → refuses with a visible diff.

Result: even if the agent's context is prompt-injected between confirmation and mint (from a web page, another agent, a tool response, or corrupted memory), the money can only move where the human signed.

Phase 3b: request_card_mint verifies + returns authorization stub. Phase 3c wires the actual mint to card.straitsx.ai/production/sse. Deployed at agentpay-tan.vercel.app.`;

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
      "Request user confirmation for a purchase. Returns a URL for the user to open and sign via EIP-712. After signing, the user gets a base64 confirmation_token to hand back — pass it to request_card_mint to actually mint the card.",
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
  {
    name: "request_card_mint",
    description:
      "Mint a scoped virtual card against a signed confirmation_token. Decodes the token, recovers the signer, verifies expiry, and asserts the (merchant, amount_sgd) in the mint request match the signed values. Mismatch → refuses the mint with a visible diff. This is the prompt-injection defence layer: even if the agent's context was hijacked between signature and mint, the money can only move where the human cryptographically signed.",
    inputSchema: {
      type: "object" as const,
      properties: {
        confirmation_token: {
          type: "string",
          description:
            "Base64-encoded confirmation token from the /confirm page (contains the EIP-712 signature + signed message).",
        },
        merchant: {
          type: "string",
          description:
            "Merchant the agent intends to mint the card for. MUST match the merchant in the signed token.",
        },
        amount_sgd: {
          type: "number",
          description:
            "Amount in SGD the agent intends to mint the card for. MUST match the amount in the signed token.",
        },
      },
      required: ["confirmation_token", "merchant", "amount_sgd"],
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
        case "request_card_mint":
          return await requestCardMint(ctx, a);
        default:
          throw new Error(`unknown tool: ${name}`);
      }
    },
  );

  return server;
}
