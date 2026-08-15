// StraitsX card-mint client over x402 (exact scheme, EIP-3009).
// Promoted from scripts/mint-test.ts — the client that minted the real
// production card (vault SIG-020). Direct HTTP is StraitsX's designed flow
// (SIG-021): POST issue_card → 402 challenge → sign TransferWithAuthorization
// → retry with base64 PAYMENT-SIGNATURE (transports-v2 accepted-echo shape).
//
// Trust rules enforced here, at the rail edge:
// - The challenge must demand EXACTLY the user-confirmed amount, on the
//   expected chain, in the expected XSGD contract — otherwise we refuse to
//   sign. A tampered or spoofed challenge cannot move more than the Tuple.
// - The raw mint response carries full card credentials (card_html with
//   PAN/CVV, card_opaque_id). This module never logs it and returns only a
//   whitelisted subset. Callers decide what the agent may see.

import { randomBytes } from "node:crypto";
import { privateKeyToAccount } from "viem/accounts";

export type StraitsXEnv = "sandbox" | "production";

export const STRAITSX_CHAIN_ID: Record<StraitsXEnv, number> = {
  sandbox: 43113, // Avalanche Fuji
  production: 43114, // Avalanche C-Chain mainnet
};

// EIP-55 checksummed (viem rejects the mixed-case variants some docs carry).
export const XSGD_ASSET: Record<StraitsXEnv, `0x${string}`> = {
  sandbox: "0xd769410dc8772695A7f55a304d2125320A65c2a5",
  production: "0xb2F85b7AB3c2b6f62DF06dE6aE7D09c010a5096E",
};

// XSGD has 6 decimals; the Tuple stores SGD cents (2 decimals).
const XSGD_UNITS_PER_CENT = 10_000n;

export type MintRequest = {
  // From the VERIFIED Tuple — never from agent-supplied arguments.
  amountCents: bigint;
  cardholderName: string;
  env: StraitsXEnv;
};

export type MintSuccess = {
  ok: true;
  amountSgd: string;
  settlementTx: string;
  snowtraceUrl: string;
  // Credential material — for the server-side card vault only.
  // MUST NOT reach any agent-visible surface.
  cardOpaqueId: string;
  iframeUrl?: string;
};

// paymentAttempted separates the two failure worlds: before the paid retry
// (nothing signed or sent — retry is free) vs after (the facilitator may
// have settled on-chain even though the response failed — retry can double-
// spend; verify the chain first).
export type MintFailure = { ok: false; reason: string; paymentAttempted: boolean };
export type MintResult = MintSuccess | MintFailure;

export function straitsxEnv(): StraitsXEnv {
  return process.env.STRAITSX_ENV === "sandbox" ? "sandbox" : "production";
}

export function snowtraceTxUrl(env: StraitsXEnv, tx: string): string {
  return env === "production"
    ? `https://snowtrace.io/tx/${tx}`
    : `https://testnet.snowtrace.io/tx/${tx}`;
}

function loadServerKey(): `0x${string}` | null {
  const key = process.env.WALLET_PRIVATE_KEY;
  if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key)) return null;
  return key as `0x${string}`;
}

export function serverWalletAccount() {
  const key = loadServerKey();
  return key ? privateKeyToAccount(key) : null;
}

export async function mintCard(req: MintRequest): Promise<MintResult> {
  const account = serverWalletAccount();
  if (!account) {
    return { ok: false, reason: "server wallet key is not configured", paymentAttempted: false };
  }

  const url = `https://card.straitsx.ai/${req.env}/cardapi/issue_card`;
  // The body drives the challenge price AND the card value (SIG-021).
  // Sent on both the challenge request and the paid retry.
  const body = JSON.stringify({
    amount_sgd: Number(req.amountCents) / 100,
    cardholder_name: req.cardholderName,
    wallet_address: account.address,
  });

  // Step 1 — fetch the x402 challenge.
  let challenge: {
    x402Version?: number;
    accepts?: Array<{
      chainId?: number;
      asset?: string;
      amount?: string;
      payTo?: string;
      maxTimeoutSeconds?: number;
      extra?: { name?: string; version?: string };
    }>;
  };
  let status: number;
  try {
    const r1 = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    status = r1.status;
    challenge = await r1.json();
  } catch (e) {
    return { ok: false, reason: `challenge request failed: ${(e as Error).message}`, paymentAttempted: false };
  }
  const acc = challenge.accepts?.[0];
  if (status !== 402 || !acc) {
    return { ok: false, reason: `expected an HTTP 402 challenge, got HTTP ${status}`, paymentAttempted: false };
  }

  // Step 2 — refuse to sign unless the challenge matches the Tuple exactly.
  const expectedUnits = req.amountCents * XSGD_UNITS_PER_CENT;
  if (acc.chainId !== STRAITSX_CHAIN_ID[req.env]) {
    return { ok: false, reason: `challenge chainId ${acc.chainId} != expected ${STRAITSX_CHAIN_ID[req.env]}`, paymentAttempted: false };
  }
  if (acc.asset?.toLowerCase() !== XSGD_ASSET[req.env].toLowerCase()) {
    return { ok: false, reason: `challenge asset ${acc.asset} is not the expected XSGD contract`, paymentAttempted: false };
  }
  let demandedUnits: bigint;
  try {
    demandedUnits = BigInt(acc.amount ?? "");
  } catch {
    return { ok: false, reason: `challenge amount is not parseable: ${acc.amount}`, paymentAttempted: false };
  }
  if (demandedUnits !== expectedUnits) {
    return {
      ok: false,
      reason: `challenge demands ${demandedUnits} XSGD units; the confirmed Tuple allows exactly ${expectedUnits}`,
      paymentAttempted: false,
    };
  }
  if (!acc.payTo) {
    return { ok: false, reason: "challenge has no payTo address", paymentAttempted: false };
  }

  // Step 3 — sign EIP-3009 TransferWithAuthorization for exactly the demand.
  const now = Math.floor(Date.now() / 1000);
  const authorization = {
    from: account.address,
    to: acc.payTo as `0x${string}`,
    value: demandedUnits,
    validAfter: 0n,
    validBefore: BigInt(now + (acc.maxTimeoutSeconds ?? 300)),
    nonce: `0x${randomBytes(32).toString("hex")}` as `0x${string}`,
  };
  const signature = await account.signTypedData({
    domain: {
      name: acc.extra?.name ?? "XSGD",
      version: acc.extra?.version ?? "2",
      chainId: acc.chainId,
      // Byte-identical to acc.asset (asserted above); our canonical form
      // carries the EIP-55 checksum viem requires.
      verifyingContract: XSGD_ASSET[req.env],
    },
    types: {
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    },
    primaryType: "TransferWithAuthorization",
    message: authorization,
  });

  // Transports-v2 shape: the chosen accepts entry is echoed back as `accepted`.
  const paymentPayload = {
    x402Version: challenge.x402Version ?? 1,
    accepted: acc,
    payload: {
      signature,
      authorization: {
        from: authorization.from,
        to: authorization.to,
        value: demandedUnits.toString(),
        validAfter: authorization.validAfter.toString(),
        validBefore: authorization.validBefore.toString(),
        nonce: authorization.nonce,
      },
    },
  };
  const header = Buffer.from(JSON.stringify(paymentPayload)).toString("base64");

  // Step 4 — the paid retry. The facilitator settles on-chain first, then
  // returns the card (SIG-020). From here on, every failure is
  // paymentAttempted: true — the XSGD may already be gone.
  let r2: Response;
  let rawText: string;
  try {
    r2 = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "PAYMENT-SIGNATURE": header },
      body,
    });
    rawText = await r2.text();
  } catch (e) {
    return {
      ok: false,
      reason: `paid mint request failed: ${(e as Error).message}`,
      paymentAttempted: true,
    };
  }
  let card: Record<string, unknown>;
  try {
    card = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    card = {};
  }
  if (r2.status !== 200) {
    // Error responses carry no card credentials; keep them for diagnosis.
    const pr =
      r2.headers.get("payment-response") ?? r2.headers.get("PAYMENT-RESPONSE");
    let prDecoded = "";
    if (pr) {
      try {
        prDecoded = Buffer.from(pr, "base64").toString("utf8");
      } catch {
        prDecoded = pr;
      }
    }
    const detail = [
      prDecoded ? `PAYMENT-RESPONSE: ${prDecoded.slice(0, 300)}` : "no PAYMENT-RESPONSE header",
      rawText ? `body: ${rawText.slice(0, 300)}` : "empty body",
    ].join(" · ");
    return {
      ok: false,
      reason: `mint rejected: HTTP ${r2.status} — ${detail}`,
      paymentAttempted: true,
    };
  }

  const settlementTx =
    typeof card.settlement_tx === "string" ? card.settlement_tx : null;
  const cardOpaqueId =
    typeof card.card_opaque_id === "string" ? card.card_opaque_id : null;
  if (!settlementTx || !cardOpaqueId) {
    return {
      ok: false,
      reason: "mint response missing settlement_tx or card_opaque_id",
      paymentAttempted: true,
    };
  }

  return {
    ok: true,
    amountSgd:
      typeof card.amount_sgd === "string"
        ? card.amount_sgd
        : (Number(req.amountCents) / 100).toFixed(2),
    settlementTx,
    snowtraceUrl: snowtraceTxUrl(req.env, settlementTx),
    cardOpaqueId,
    iframeUrl: typeof card.iframe_url === "string" ? card.iframe_url : undefined,
  };
}
