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
  .command("propose")
  .description(
    "Propose a purchase — prints a confirmation URL for the user to open and sign.",
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
      await callTool(opts.endpoint, "propose_purchase", {
        merchant: opts.merchant,
        amount_sgd: opts.amount,
        expiry_seconds: opts.expiry,
      });
    },
  );

program
  .command("execute")
  .description(
    "Execute a confirmed purchase against a signed confirmation_token. Verifies signature + (merchant, amount) match. Prompt-injection defence in action.",
  )
  .requiredOption(
    "-t, --token <base64>",
    "Base64 confirmation token from /confirm page",
  )
  .requiredOption(
    "-m, --merchant <name>",
    "Merchant to mint for (must match signed token)",
  )
  .requiredOption(
    "-a, --amount <sgd>",
    "Amount in SGD (must match signed token)",
    parseFloat,
  )
  .option("-e, --endpoint <url>", "MCP endpoint URL", DEFAULT_ENDPOINT)
  .action(
    async (opts: {
      token: string;
      merchant: string;
      amount: number;
      endpoint: string;
    }) => {
      await callTool(opts.endpoint, "execute_purchase", {
        confirmation_token: opts.token,
        merchant: opts.merchant,
        amount_sgd: opts.amount,
      });
    },
  );

program
  .command("receipt")
  .description(
    "Fetch a Mint Gate receipt — proof chain of a mint, or the signed Block Receipt of a refusal. Omit --id for the latest.",
  )
  .option("-i, --id <receipt_id>", "Receipt id (rcpt_…) from an execute result")
  .option("-e, --endpoint <url>", "MCP endpoint URL", DEFAULT_ENDPOINT)
  .action(async (opts: { id?: string; endpoint: string }) => {
    await callTool(
      opts.endpoint,
      "get_receipt",
      opts.id ? { receipt_id: opts.id } : {},
    );
  });

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
