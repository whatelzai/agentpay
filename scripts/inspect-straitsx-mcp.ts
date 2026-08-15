/**
 * Inspect the StraitsX card MCP server: list tools, schemas, resources, prompts.
 * Usage: tsx scripts/inspect-straitsx-mcp.ts [sandbox|production]
 * Read-only. Makes no payments.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const env = process.argv[2] === "production" ? "production" : "sandbox";
const url = new URL(`https://card.straitsx.ai/${env}/sse`);

async function main() {
  console.log(`── connecting to ${url.href}`);
  const transport = new SSEClientTransport(url);
  const client = new Client(
    { name: "agentpay-inspector", version: "0.0.1" },
    { capabilities: {} },
  );
  await client.connect(transport);

  const server = client.getServerVersion();
  console.log("── server:", JSON.stringify(server));
  const instructions = client.getInstructions?.();
  if (instructions) {
    console.log("── instructions:\n" + instructions + "\n");
  }

  const tools = await client.listTools();
  console.log(`── ${tools.tools.length} tool(s):`);
  for (const t of tools.tools) {
    console.log(`\n=== TOOL: ${t.name} ===`);
    if (t.description) console.log(t.description);
    console.log("inputSchema:", JSON.stringify(t.inputSchema, null, 2));
  }

  try {
    const r = await client.listResources();
    if (r.resources.length) console.log("\n── resources:", JSON.stringify(r.resources, null, 2));
  } catch { /* not supported */ }
  try {
    const p = await client.listPrompts();
    if (p.prompts.length) console.log("\n── prompts:", JSON.stringify(p.prompts, null, 2));
  } catch { /* not supported */ }

  await client.close();
}

main().catch((e) => {
  console.error("ERROR:", e instanceof Error ? e.message : e);
  process.exit(1);
});
