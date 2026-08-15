import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import {
  ping,
  proposePurchase,
  executePurchase,
  getReceiptTool,
  getConfirmationTool,
} from "../lib/mcp/tools/index";
import type { ToolContext } from "../lib/mcp/tools/types";
import pkg from "../../package.json";

export const AGENTPAY_INSTRUCTIONS = `AgentPay is the trust layer for AI-agent payments. It closes the prompt-injection gap that the card layer alone cannot.

Flow:
1. Agent calls propose_purchase({merchant, amount_sgd}) → returns a URL for the user to open and sign, plus a request_id.
2. User signs the (merchant, amount, expiry, nonce) tuple in the browser via EIP-712 typed data — the signed confirmation_token is delivered back to AgentPay automatically.
3. Agent polls get_confirmation({request_id}) until the token arrives (fallback: the user pastes the token into the chat).
4. Agent calls execute_purchase(confirmation_token, merchant, amount) — AgentPay decodes the token, recovers the signer, verifies expiry, owner, and nonce freshness, and asserts (merchant, amount) in the mint request match the signed values. Mismatch → refuses with a visible diff and a signed Block Receipt. Match → mints a scoped card on the StraitsX rail; get_receipt returns the proof chain.

Result: even if the agent's context is prompt-injected between confirmation and mint (from a web page, another agent, a tool response, or corrupted memory), the money can only move where the human signed.

Deployed at agentpay-tan.vercel.app.`;

export const AGENTPAY_TOOLS = [
  {
    name: "ping",
    description:
      "Health check — confirms AgentPay MCP server is reachable and returns version and transport mode.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "propose_purchase",
    description:
      "Propose a purchase for user confirmation. Returns a URL for the user to open and sign via EIP-712. After signing, the user gets a base64 confirmation_token to hand back — pass it to execute_purchase to actually mint the card.",
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
          description: "Amount in SGD. The card rail accepts 5–30 SGD.",
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
    name: "execute_purchase",
    description:
      "Execute a confirmed purchase: mint a scoped virtual card against a signed confirmation_token. Decodes the token, recovers the signer, verifies expiry and owner, refuses replayed tokens, and asserts the (merchant, amount_sgd) in the mint request match the signed values. Mismatch → refuses the mint with a visible diff and a logged Block Receipt. On success returns {authorized, amount_sgd, settlement_tx, snowtrace_url} — card credentials are never returned to the agent; the human views the card separately. This is the prompt-injection defence layer: even if the agent's context was hijacked between signature and mint, the money can only move where the human cryptographically signed.",
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
  {
    name: "get_confirmation",
    description:
      "Poll for the user's signed confirmation. Returns the confirmation_token once the user has signed on the /confirm page; before that, reports pending. Pass the request_id that propose_purchase returned.",
    inputSchema: {
      type: "object" as const,
      properties: {
        request_id: {
          type: "string",
          description: "Request id (req_…) from propose_purchase.",
        },
      },
      required: ["request_id"],
    },
  },
  {
    name: "get_receipt",
    description:
      "Fetch the receipt of a Mint Gate outcome — the proof chain of a mint (signed Tuple → settlement tx → Snowtrace link) or the signed Block Receipt of a refusal (requested vs confirmed, reason). Omit receipt_id for the most recent receipt. Receipts contain no card credentials.",
    inputSchema: {
      type: "object" as const,
      properties: {
        receipt_id: {
          type: "string",
          description:
            "Receipt id from an execute_purchase result (e.g. rcpt_…). Omit for the latest receipt.",
        },
      },
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
        case "propose_purchase":
          return await proposePurchase(ctx, a);
        case "execute_purchase":
          return await executePurchase(ctx, a);
        case "get_confirmation":
          return await getConfirmationTool(ctx, a);
        case "get_receipt":
          return await getReceiptTool(ctx, a);
        default:
          throw new Error(`unknown tool: ${name}`);
      }
    },
  );

  return server;
}
