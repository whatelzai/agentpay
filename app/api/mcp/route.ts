import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { buildAgentPayServer } from "@/src/mcp/setup";
import type { ToolContext } from "@/src/lib/mcp/tools/types";

export const dynamic = "force-dynamic";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, content-type, mcp-protocol-version, mcp-session-id",
  "Access-Control-Expose-Headers": "mcp-session-id",
  "Access-Control-Max-Age": "86400",
};

function withCors(response: Response): Response {
  for (const [k, v] of Object.entries(CORS_HEADERS)) response.headers.set(k, v);
  return response;
}

async function handleMcp(request: Request): Promise<Response> {
  const ctx: ToolContext = {
    mode: "http",
    baseUrl: new URL(request.url).origin,
  };
  const server = buildAgentPayServer(ctx);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  await server.connect(transport);
  return withCors(await transport.handleRequest(request));
}

export const POST = handleMcp;

function methodNotAllowed(): Response {
  return withCors(
    Response.json(
      {
        jsonrpc: "2.0",
        error: { code: -32000, message: "Method not allowed." },
        id: null,
      },
      { status: 405, headers: { Allow: "POST, OPTIONS" } },
    ),
  );
}

// This server is stateless and sends no unsolicited notifications. Opening a
// GET SSE stream only leaves a Vercel function running until its timeout.
export const GET = methodNotAllowed;
export const DELETE = methodNotAllowed;

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
