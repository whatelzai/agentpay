import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { buildAgentPayServer } from "./setup.js";
import type { ToolContext } from "../lib/mcp/tools/types.js";

const ctx: ToolContext = { mode: "stdio" };
const server = buildAgentPayServer(ctx);
const transport = new StdioServerTransport();
await server.connect(transport);
