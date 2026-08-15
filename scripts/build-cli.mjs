// Bundle CLI entry to plain JS via esbuild so `agentpay <cmd>` skips
// tsx cold-start. Keeps @modelcontextprotocol/sdk and commander external
// — they resolve from the installed node_modules at runtime.

import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

await build({
  entryPoints: [path.join(root, "src/cli/index.ts")],
  outfile: path.join(root, "dist/cli/index.mjs"),
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  external: ["@modelcontextprotocol/sdk", "commander"],
  logLevel: "info",
});

console.log("✓ CLI built to dist/cli/index.mjs");
