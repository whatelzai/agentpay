import { Command } from "commander";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import pkg from "../../package.json";

const DEFAULT_ENDPOINT = "https://agentpay-tan.vercel.app/api/mcp";

const program = new Command();
program
  .name("agentpay")
  .description("AgentPay CLI — trust layer for AI-agent payments")
  .version(pkg.version);

program
  .command("ping")
  .description("Health check against the AgentPay MCP server")
  .option("-e, --endpoint <url>", "MCP endpoint URL", DEFAULT_ENDPOINT)
  .action(async (opts: { endpoint: string }) => {
    await callTool(opts.endpoint, "ping", {});
  });

program
  .command("confirm")
  .description(
    "Request a signed confirmation URL for a purchase. Prints the URL for the user to open and sign.",
  )
  .requiredOption("-m, --merchant <name>", "Merchant to purchase from")
  .requiredOption("-a, --amount <sgd>", "Amount in SGD", parseFloat)
  .option(
    "-x, --expiry <seconds>",
    "Expiry in seconds (default 300)",
    (v) => parseInt(v, 10),
    300,
  )
  .option("-e, --endpoint <url>", "MCP endpoint URL", DEFAULT_ENDPOINT)
  .action(
    async (opts: {
      merchant: string;
      amount: number;
      expiry: number;
      endpoint: string;
    }) => {
      await callTool(opts.endpoint, "confirm_purchase", {
        merchant: opts.merchant,
        amount_sgd: opts.amount,
        expiry_seconds: opts.expiry,
      });
    },
  );

async function callTool(
  endpoint: string,
  name: string,
  args: Record<string, unknown>,
) {
  const transport = new StreamableHTTPClientTransport(new URL(endpoint));
  const client = new Client(
    { name: "agentpay-cli", version: pkg.version },
    { capabilities: {} },
  );
  await client.connect(transport);
  try {
    const result = await client.callTool({ name, arguments: args });
    const content = result.content as Array<{ type: string; text?: string }>;
    for (const c of content) {
      if (c.type === "text" && c.text) console.log(c.text);
    }
  } finally {
    await client.close();
  }
}

program.parseAsync(process.argv).catch((err: Error) => {
  console.error("Error:", err.message);
  process.exit(1);
});
