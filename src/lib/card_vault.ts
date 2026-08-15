// Server-side card vault. Holds the credential material a mint returns —
// card_opaque_id is the ONLY secret protecting a live card (SIG-020: the
// settlement tx is public), so it lives here and nowhere else.
//
// Deliberately a separate store from receipts: a receipt is agent-visible
// and must never be one JSON.stringify away from card credentials. Nothing
// in this module is exported to any MCP tool result. The human-facing
// view-card flow (if built) reads it server-side under a secret that the
// agent never sees — not under the receipt id the agent knows.

import { randomBytes } from "node:crypto";

type CardSecret = {
  cardOpaqueId: string;
  settlementTx: string;
  iframeUrl?: string;
};

const vault = ((globalThis as Record<string, unknown>).__agentpayCardVault ??=
  new Map<string, CardSecret>()) as Map<string, CardSecret>;

// Returns the view secret (vault key). Server-side use only.
export function storeCardSecret(secret: CardSecret): string {
  const viewSecret = `view_${randomBytes(16).toString("hex")}`;
  vault.set(viewSecret, secret);
  return viewSecret;
}

export function getCardSecret(viewSecret: string): CardSecret | undefined {
  return vault.get(viewSecret);
}
