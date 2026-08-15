/**
 * Offline flow test for the phase 3c Mint Gate. ZERO network calls: global
 * fetch is replaced with a mock StraitsX rail that speaks the exact shapes
 * captured live in vault SIG-020/021 (402 challenge, transports-v2 payment
 * echo, 200 card response with fake credentials).
 *
 * Run: npx tsx scripts/flow-test.ts
 * Exit 0 = all scenarios pass.
 */
import { recoverTypedDataAddress } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import {
  agentPayDomain,
  CONFIRMATION_TYPES,
  LEGACY_AGENTPAY_DOMAIN,
  LEGACY_CONFIRMATION_TYPES,
} from "../src/lib/binding/schema";
import { encodeToken } from "../src/lib/binding/verify";
import { executePurchase } from "../src/lib/mcp/tools/execute_purchase";
import { getReceiptTool } from "../src/lib/mcp/tools/get_receipt";
import { proposePurchase } from "../src/lib/mcp/tools/propose_purchase";
import { getConfirmationTool } from "../src/lib/mcp/tools/get_confirmation";
import {
  getConfirmation,
  putConfirmation,
} from "../src/lib/confirmations";
import {
  listReceipts,
  BLOCK_RECEIPT_DOMAIN,
  BLOCK_RECEIPT_TYPES,
  type BlockReceipt,
} from "../src/lib/receipts";
import {
  paymentAuthorizationHash,
  transferAuthorizationTypedData,
} from "../src/lib/payments/eip3009";
import { prepareCardMint } from "../src/lib/straitsx/client";
import { sealConfirmationToken } from "../src/lib/signing/confirmation_seal";

// ── test wallets (throwaway, generated per run) ────────────────────────────
const ownerAccount = privateKeyToAccount(generatePrivateKey());
const serverKey = generatePrivateKey();
const receiptKey = generatePrivateKey();
const receiptAccount = privateKeyToAccount(receiptKey);
const strangerAccount = privateKeyToAccount(generatePrivateKey());
const confirmationSealingKey = generatePrivateKey();

process.env.AGENTPAY_FUNDING_MODE = "platform_wallet";
process.env.DEMO_OWNER_ADDRESS = ownerAccount.address;
process.env.STRAITSX_PAYER_PRIVATE_KEY = serverKey;
process.env.RECEIPT_SIGNER_PRIVATE_KEY = receiptKey;
process.env.STRAITSX_ENV = "production";
process.env.CONFIRMATION_SEALING_KEY = confirmationSealingKey;

// ── fake credential material the agent must NEVER see ──────────────────────
const FAKE_PAN = "4665 1711 2233 5538";
const FAKE_OPAQUE_ID = "01KBTESTFAKEOPAQUEID000000";
const FAKE_IFRAME = "https://iframe.example/cvv?jwt=FAKEJWT";
const FAKE_TX =
  "0xef78c93af44ef0c1fc18d5278060b9a681043fc942616d5e6bcd2231bac03552";

// ── mock StraitsX rail ─────────────────────────────────────────────────────
let fetchCalls: Array<{ paid: boolean; bodyAmountSgd: number }> = [];
let tamperChallenge = false;
let failPaidRetry = false;

const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
  const url = String(input);
  if (!url.includes("card.straitsx.ai")) {
    throw new Error(`unexpected network call in flow-test: ${url}`);
  }
  const headers = (init?.headers ?? {}) as Record<string, string>;
  const paid = Boolean(headers["PAYMENT-SIGNATURE"]);
  const body = JSON.parse(String(init?.body ?? "{}"));
  fetchCalls.push({ paid, bodyAmountSgd: body.amount_sgd });

  const units = BigInt(Math.round(body.amount_sgd * 100)) * 10_000n;
  if (!paid) {
    const demanded = tamperChallenge ? units * 2n : units;
    return Response.json(
      {
        x402Version: 1,
        accepts: [
          {
            scheme: "exact",
            chainId: 43114,
            asset: "0xb2F85b7AB3c2b6f62DF06dE6aE7D09c010a5096E",
            amount: demanded.toString(),
            payTo: "0x99a2B2962a6AC463FBe04664027Fdb3F68bd4Cc8",
            maxTimeoutSeconds: 300,
            extra: { name: "XSGD", version: "2" },
          },
        ],
      },
      { status: 402 },
    );
  }
  if (failPaidRetry) {
    // The live 2026-08-15 incident: settlement succeeded, issuance 500'd
    // with an empty body and no card fields.
    return new Response("", { status: 500 });
  }
  return Response.json(
    {
      amount_sgd: body.amount_sgd.toFixed(2),
      card_opaque_id: FAKE_OPAQUE_ID,
      card_html: `<div class="card">${FAKE_PAN} EXP 08/29 CVV 123</div>`,
      iframe_url: FAKE_IFRAME,
      settlement_tx: FAKE_TX,
      message: "Save BOTH card_opaque_id AND settlement_tx",
    },
    { status: 200, headers: { "PAYMENT-RESPONSE": "eyJzdWNjZXNzIjp0cnVlfQ==" } },
  );
}) as typeof fetch;

// ── helpers ────────────────────────────────────────────────────────────────
let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ✓ ${name}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function makeToken(opts: {
  merchant: string;
  amountCents: bigint;
  expiryInSeconds?: number;
  account?: typeof ownerAccount;
}): Promise<string> {
  const account = opts.account ?? ownerAccount;
  const expiryTimestamp = BigInt(
    Math.floor(Date.now() / 1000) + (opts.expiryInSeconds ?? 300),
  );
  const nonceBytes = crypto.getRandomValues(new Uint8Array(32));
  const nonce = ("0x" +
    Array.from(nonceBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")) as `0x${string}`;
  const message = {
    merchant: opts.merchant,
    amountSgd: opts.amountCents,
    expiryTimestamp,
    nonce,
  };
  const signature = await account.signTypedData({
    domain: LEGACY_AGENTPAY_DOMAIN,
    types: LEGACY_CONFIRMATION_TYPES,
    primaryType: "Confirmation",
    message,
  });
  return encodeToken({
    version: 1,
    ...message,
    signature,
    signer: account.address,
  });
}

async function makeUserToken(opts: {
  merchant: string;
  amountCents: bigint;
  requestId?: string;
  account?: typeof ownerAccount;
}) {
  const account = opts.account ?? ownerAccount;
  const requestId =
    opts.requestId ?? `req_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
  const prepared = await prepareCardMint({
    amountCents: opts.amountCents,
    cardholderName: "AgentPay User",
    environment: "production",
    payerAddress: account.address,
  });
  if (!prepared.ok) throw new Error(prepared.reason);

  const paymentSignature = await account.signTypedData(
    transferAuthorizationTypedData(prepared.intent),
  );
  const message = {
    requestId,
    merchant: opts.merchant,
    amountSgd: opts.amountCents,
    expiryTimestamp: BigInt(
      Math.min(
        Math.floor(Date.now() / 1000) + 300,
        Number(prepared.intent.authorization.validBefore),
      ),
    ),
    nonce: generatePrivateKey(),
    paymentRail: "straitsx" as const,
    payer: account.address,
    paymentAuthorizationHash: paymentAuthorizationHash(prepared.intent),
  };
  const signature = await account.signTypedData({
    domain: agentPayDomain(43114),
    types: CONFIRMATION_TYPES,
    primaryType: "Confirmation",
    message,
  });
  const decoded = {
    version: 2 as const,
    chainId: 43114 as const,
    ...message,
    signature,
    signer: account.address,
    paymentProof: { intent: prepared.intent, signature: paymentSignature },
  };
  const rawToken = encodeToken(decoded);
  return {
    token: sealConfirmationToken(rawToken),
    rawToken,
    decoded,
  };
}

const ctx = { mode: "stdio" as const };
const allResults: string[] = [];
async function run(args: Record<string, unknown>) {
  const result = await executePurchase(ctx, args);
  const text = result.content
    .map((c) => (c.type === "text" ? c.text : ""))
    .join("\n");
  allResults.push(text);
  return { result, text };
}

// ── scenarios ──────────────────────────────────────────────────────────────
async function main() {
  console.log("S1 — happy path (6.50 SGD, owner-signed, exact match)");
  const happyToken = await makeToken({
    merchant: "Book Store",
    amountCents: 650n,
  });
  {
    fetchCalls = [];
    const { result, text } = await run({
      confirmation_token: happyToken,
      merchant: "Book Store",
      amount_sgd: 6.5,
    });
    check("authorized", !result.isError, text);
    check("returns settlement_tx", text.includes(FAKE_TX));
    check("returns snowtrace url", text.includes(`https://snowtrace.io/tx/${FAKE_TX}`));
    check("challenge + paid retry", fetchCalls.length === 2 && !fetchCalls[0].paid && fetchCalls[1].paid);
    check("body drives price on both calls", fetchCalls.every((c) => c.bodyAmountSgd === 6.5));
  }

  console.log("S2 — amount tampered by injected agent (6.50 signed, 25.00 asked)");
  {
    const token = await makeToken({ merchant: "Book Store", amountCents: 650n });
    fetchCalls = [];
    const { result, text } = await run({
      confirmation_token: token,
      merchant: "Book Store",
      amount_sgd: 25,
    });
    check("refused", result.isError === true);
    check("shows diff", text.includes("agent asked SGD 25.00") && text.includes("user confirmed SGD 6.50"));
    check("block receipt logged", text.includes("Block Receipt"));
    check("no rail call on refusal", fetchCalls.length === 0);
  }

  console.log("S3 — merchant tampered (Book Store signed, Evil Store asked)");
  {
    const token = await makeToken({ merchant: "Book Store", amountCents: 650n });
    const { result, text } = await run({
      confirmation_token: token,
      merchant: "Evil Store",
      amount_sgd: 6.5,
    });
    check("refused", result.isError === true);
    check("shows merchant diff", text.includes('user confirmed "Book Store"'));
  }

  console.log("S4 — replay of an already-used token");
  {
    const { result, text } = await run({
      confirmation_token: happyToken,
      merchant: "Book Store",
      amount_sgd: 6.5,
    });
    check("refused", result.isError === true);
    check("names the replay", text.includes("already used"));
  }

  console.log("S5 — valid signature from a non-owner wallet");
  {
    const token = await makeToken({
      merchant: "Book Store",
      amountCents: 650n,
      account: strangerAccount,
    });
    const { result, text } = await run({
      confirmation_token: token,
      merchant: "Book Store",
      amount_sgd: 6.5,
    });
    check("refused", result.isError === true);
    check("names the owner rule", text.includes("platform wallet owner"));
  }

  console.log("S6 — expired confirmation");
  {
    const token = await makeToken({
      merchant: "Book Store",
      amountCents: 650n,
      expiryInSeconds: -10,
    });
    const { result, text } = await run({
      confirmation_token: token,
      merchant: "Book Store",
      amount_sgd: 6.5,
    });
    check("refused", result.isError === true);
    check("names expiry", text.includes("expired"));
  }

  console.log("S7 — amount outside the 5–50 SGD rail range");
  {
    const token = await makeToken({ merchant: "Book Store", amountCents: 300n });
    const { result, text } = await run({
      confirmation_token: token,
      merchant: "Book Store",
      amount_sgd: 3,
    });
    check("refused", result.isError === true);
    check("names the range", text.includes("5–50 SGD"));
  }

  console.log("S8 — rail-edge defence: tampered 402 challenge (demands 2×)");
  {
    const token = await makeToken({ merchant: "Book Store", amountCents: 650n });
    tamperChallenge = true;
    fetchCalls = [];
    const { result, text } = await run({
      confirmation_token: token,
      merchant: "Book Store",
      amount_sgd: 6.5,
    });
    tamperChallenge = false;
    check("mint aborted", result.isError === true);
    check("nothing signed: challenge call only", fetchCalls.length === 1 && !fetchCalls[0].paid);
    check("says confirmation not consumed", text.includes("NOT consumed"));

    const retry = await run({
      confirmation_token: token,
      merchant: "Book Store",
      amount_sgd: 6.5,
    });
    check("nonce released → honest retry mints", !retry.result.isError, retry.text);
  }

  console.log("S8b — rail fails AFTER payment (HTTP 500, empty body)");
  {
    const token = await makeToken({ merchant: "Book Store", amountCents: 650n });
    failPaidRetry = true;
    fetchCalls = [];
    const { result, text } = await run({
      confirmation_token: token,
      merchant: "Book Store",
      amount_sgd: 6.5,
    });
    failPaidRetry = false;
    check("errors", result.isError === true);
    check("payment reached the rail", fetchCalls.length === 2 && fetchCalls[1].paid);
    check("says payment was sent", text.includes("AFTER payment"));
    check("forbids retry", text.includes("Do NOT retry"));

    const retry = await run({
      confirmation_token: token,
      merchant: "Book Store",
      amount_sgd: 6.5,
    });
    check(
      "nonce stays consumed → retry refused as replay",
      retry.result.isError === true && retry.text.includes("already used"),
    );
  }

  console.log("S9 — Block Receipt is signed and verifiable");
  {
    const refusal = [...listReceipts()]
      .reverse()
      .find((r): r is BlockReceipt => r.type === "REFUSED");
    check("a refusal receipt exists", Boolean(refusal));
    if (refusal) {
      check("not degraded", !refusal.degraded && Boolean(refusal.signature));
      if (refusal.signature) {
        const recovered = await recoverTypedDataAddress({
          domain: BLOCK_RECEIPT_DOMAIN,
          types: BLOCK_RECEIPT_TYPES,
          primaryType: "BlockReceipt",
          message: {
            requestedMerchant: refusal.requested.merchant,
            requestedAmountSgd: BigInt(refusal.requested.amountSgdCents),
            confirmedMerchant: refusal.confirmed.merchant,
            confirmedAmountSgd: BigInt(refusal.confirmed.amountSgdCents),
            reason: refusal.reason,
            timestamp: BigInt(
              Math.floor(new Date(refusal.timestamp).getTime() / 1000),
            ),
          },
          signature: refusal.signature,
        });
        check(
          "signature recovers to the independent receipt signer",
          recovered.toLowerCase() === receiptAccount.address.toLowerCase(),
        );
      }
    }
  }

  console.log("S10 — get_receipt returns the proof chain / the signed refusal");
  {
    const minted = [...listReceipts()].reverse().find((r) => r.type === "MINTED");
    const latest = await getReceiptTool(ctx, { receipt_id: minted?.id });
    const latestText = latest.content
      .map((c) => (c.type === "text" ? c.text : ""))
      .join("\n");
    allResults.push(latestText);
    check("mint receipt renders the proof chain", latestText.includes("MINTED"));
    check("chain link 2: settlement tx", latestText.includes(FAKE_TX));
    check("chain link 3: snowtrace", latestText.includes("snowtrace.io/tx/"));

    const refusal = [...listReceipts()]
      .reverse()
      .find((r): r is BlockReceipt => r.type === "REFUSED");
    const byId = await getReceiptTool(ctx, { receipt_id: refusal?.id });
    const byIdText = byId.content
      .map((c) => (c.type === "text" ? c.text : ""))
      .join("\n");
    allResults.push(byIdText);
    check("refusal fetched by id", byIdText.includes("REFUSED"));
    check("refusal carries the signature", byIdText.includes(refusal?.signature ?? "__none__"));

    const missing = await getReceiptTool(ctx, { receipt_id: "rcpt_nope" });
    check("unknown id errors cleanly", missing.isError === true);
  }

  console.log("S11 — confirmation hand-off: propose → sign → poll");
  {
    const proposal = await proposePurchase(ctx, {
      merchant: "Book Store",
      amount_sgd: 6.5,
    });
    const proposalText = proposal.content
      .map((c) => (c.type === "text" ? c.text : ""))
      .join("\n");
    allResults.push(proposalText);
    const rid = proposalText.match(/req_[0-9a-f]{16}/)?.[0];
    check("proposal carries a request_id", Boolean(rid));
    check("confirm URL carries rid", proposalText.includes(`rid=${rid}`));

    const pending = await getConfirmationTool(ctx, { request_id: rid });
    const pendingText = pending.content
      .map((c) => (c.type === "text" ? c.text : ""))
      .join("\n");
    check("pending before the user signs", pendingText.includes("pending"));

    const token = await makeToken({ merchant: "Book Store", amountCents: 650n });
    check("first write stored", putConfirmation(rid!, token) === "stored");
    check("second write refused", putConfirmation(rid!, token) === "duplicate");
    check("garbage token refused", putConfirmation(rid!, "not-a-token") === "invalid");

    const confirmed = await getConfirmationTool(ctx, { request_id: rid });
    const confirmedText = confirmed.content
      .map((c) => (c.type === "text" ? c.text : ""))
      .join("\n");
    allResults.push(confirmedText);
    const capability = getConfirmation(rid!);
    check("stored value is a sealed capability", capability?.startsWith("apc1.") === true);
    check("poll returns the capability", Boolean(capability && confirmedText.includes(capability)));
    check("poll never returns the signed payload", !confirmedText.includes(token));
    check("poll points at execute_purchase", confirmedText.includes("execute_purchase"));
  }

  console.log("S12 — REDACTION SWEEP: no credential material in any agent-visible output");
  {
    const everything = JSON.stringify(allResults) + JSON.stringify(listReceipts());
    check("no card_html", !everything.includes("card_html"));
    check("no PAN", !everything.includes(FAKE_PAN) && !everything.includes("4665"));
    check("no card_opaque_id", !everything.includes(FAKE_OPAQUE_ID));
    check("no iframe/jwt", !everything.includes("FAKEJWT") && !everything.includes(FAKE_IFRAME));
  }

  process.env.AGENTPAY_FUNDING_MODE = "user_wallet";
  delete process.env.DEMO_OWNER_ADDRESS;
  delete process.env.STRAITSX_PAYER_PRIVATE_KEY;

  console.log("S13 — user-funded flow needs no platform payer key");
  {
    const prepared = await makeUserToken({
      merchant: "Book Store",
      amountCents: 650n,
    });
    fetchCalls = [];
    const { result, text } = await run({
      confirmation_token: prepared.token,
      merchant: "Book Store",
      amount_sgd: 6.5,
    });
    check("authorized from the user wallet", !result.isError, text);
    check(
      "uses the signed proof without a server-side signing call",
      fetchCalls.length === 1 && fetchCalls[0].paid,
    );
    check("reports user_wallet funding", text.includes('"funding_mode": "user_wallet"'));
    check("reports the dynamic payer", text.includes(ownerAccount.address));
    check("agent receives only an opaque capability", prepared.token.startsWith("apc1."));
  }

  console.log("S14 — a second user can fund their own independent purchase");
  {
    const prepared = await makeUserToken({
      merchant: "Cafe",
      amountCents: 700n,
      account: strangerAccount,
    });
    fetchCalls = [];
    const { result, text } = await run({
      confirmation_token: prepared.token,
      merchant: "Cafe",
      amount_sgd: 7,
    });
    check("second user authorized", !result.isError, text);
    check("second user is the payer", text.includes(strangerAccount.address));
    check("one paid rail call", fetchCalls.length === 1 && fetchCalls[0].paid);
  }

  console.log("S15 — invalid user payment signature is blocked before the rail");
  {
    const prepared = await makeUserToken({
      merchant: "Book Store",
      amountCents: 650n,
    });
    prepared.decoded.paymentProof.signature = "0x00";
    fetchCalls = [];
    const { result, text } = await run({
      confirmation_token: sealConfirmationToken(encodeToken(prepared.decoded)),
      merchant: "Book Store",
      amount_sgd: 6.5,
    });
    check("refused", result.isError === true);
    check("names payment authorization", text.includes("payment authorization failed"));
    check("no rail call", fetchCalls.length === 0);
  }

  console.log("S16 — a valid but replaced payment proof is blocked by the hash Binding");
  {
    const original = await makeUserToken({
      merchant: "Book Store",
      amountCents: 650n,
    });
    const replacement = await makeUserToken({
      merchant: "Book Store",
      amountCents: 650n,
    });
    original.decoded.paymentProof = replacement.decoded.paymentProof;
    fetchCalls = [];
    const { result, text } = await run({
      confirmation_token: sealConfirmationToken(encodeToken(original.decoded)),
      merchant: "Book Store",
      amount_sgd: 6.5,
    });
    check("refused", result.isError === true);
    check("names replacement", text.includes("replaced after confirmation"));
    check("no rail call", fetchCalls.length === 0);
  }

  console.log("S17 — a version 2 token cannot move to a different request id");
  {
    const signedRequest = "req_1111111111111111";
    const otherRequest = "req_2222222222222222";
    const prepared = await makeUserToken({
      merchant: "Book Store",
      amountCents: 650n,
      requestId: signedRequest,
    });
    check(
      "cross-request hand-off refused",
      putConfirmation(otherRequest, prepared.rawToken) === "invalid",
    );
    check(
      "matching request hand-off stored",
      putConfirmation(signedRequest, prepared.rawToken) === "stored",
    );
  }

  console.log("S18 — legacy tokens cannot spend through user_wallet mode");
  {
    const legacy = await makeToken({ merchant: "Book Store", amountCents: 650n });
    fetchCalls = [];
    const { result, text } = await run({
      confirmation_token: legacy,
      merchant: "Book Store",
      amount_sgd: 6.5,
    });
    check("refused", result.isError === true);
    check("requires user payment authorization", text.includes("no user payment authorization"));
    check("no rail call", fetchCalls.length === 0);
  }

  console.log("S19 — raw user-wallet payload is never accepted from an agent");
  {
    const prepared = await makeUserToken({
      merchant: "Book Store",
      amountCents: 650n,
    });
    fetchCalls = [];
    const { result, text } = await run({
      confirmation_token: prepared.rawToken,
      merchant: "Book Store",
      amount_sgd: 6.5,
    });
    check("refused", result.isError === true);
    check("requires an AgentPay seal", text.includes("must be AgentPay-sealed"));
    check("no rail call", fetchCalls.length === 0);
  }

  console.log("S20 — malformed nested payment proof fails closed");
  {
    const prepared = await makeUserToken({
      merchant: "Book Store",
      amountCents: 650n,
    });
    prepared.decoded.paymentProof.intent.authorization = null as never;
    fetchCalls = [];
    const { result, text } = await run({
      confirmation_token: sealConfirmationToken(encodeToken(prepared.decoded)),
      merchant: "Book Store",
      amount_sgd: 6.5,
    });
    check("refused without throwing", result.isError === true);
    check("names malformed authorization", text.includes("malformed authorization"));
    check("no rail call", fetchCalls.length === 0);
  }

  console.log("S21 — execution never rounds a sub-cent amount");
  {
    const prepared = await makeUserToken({
      merchant: "Book Store",
      amountCents: 650n,
    });
    fetchCalls = [];
    const { result, text } = await run({
      confirmation_token: prepared.token,
      merchant: "Book Store",
      amount_sgd: 6.501,
    });
    check("refused", result.isError === true);
    check("states that execution is never rounded", text.includes("never rounds"));
    check("no rail call", fetchCalls.length === 0);
  }

  console.log("S22 — tampered sealed capability fails authentication");
  {
    const prepared = await makeUserToken({
      merchant: "Book Store",
      amountCents: 650n,
    });
    const replacement = prepared.token.endsWith("A") ? "B" : "A";
    const tampered = prepared.token.slice(0, -1) + replacement;
    fetchCalls = [];
    const { result, text } = await run({
      confirmation_token: tampered,
      merchant: "Book Store",
      amount_sgd: 6.5,
    });
    check("refused", result.isError === true);
    check("cannot be opened", text.includes("could not be opened"));
    check("no rail call", fetchCalls.length === 0);
  }

  console.log("S23 — final credential-redaction sweep");
  {
    const everything = JSON.stringify(allResults) + JSON.stringify(listReceipts());
    check("no card_html", !everything.includes("card_html"));
    check("no PAN", !everything.includes(FAKE_PAN) && !everything.includes("4665"));
    check("no card_opaque_id", !everything.includes(FAKE_OPAQUE_ID));
    check("no iframe/jwt", !everything.includes("FAKEJWT") && !everything.includes(FAKE_IFRAME));
  }

  globalThis.fetch = realFetch;
  if (failures > 0) {
    console.error(`\n${failures} check(s) FAILED`);
    process.exit(1);
  }
  console.log("\nAll checks passed.");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
