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
import { AGENTPAY_DOMAIN, CONFIRMATION_TYPES } from "../src/lib/binding/schema";
import { encodeToken } from "../src/lib/binding/verify";
import { executePurchase } from "../src/lib/mcp/tools/execute_purchase";
import {
  listReceipts,
  BLOCK_RECEIPT_DOMAIN,
  BLOCK_RECEIPT_TYPES,
  type BlockReceipt,
} from "../src/lib/receipts";

// ── test wallets (throwaway, generated per run) ────────────────────────────
const ownerAccount = privateKeyToAccount(generatePrivateKey());
const serverKey = generatePrivateKey();
const serverAccount = privateKeyToAccount(serverKey);
const strangerAccount = privateKeyToAccount(generatePrivateKey());

process.env.OWNER_ADDRESS = ownerAccount.address;
process.env.WALLET_PRIVATE_KEY = serverKey;
process.env.STRAITSX_ENV = "production";

// ── fake credential material the agent must NEVER see ──────────────────────
const FAKE_PAN = "4665 1711 2233 5538";
const FAKE_OPAQUE_ID = "01KBTESTFAKEOPAQUEID000000";
const FAKE_IFRAME = "https://iframe.example/cvv?jwt=FAKEJWT";
const FAKE_TX =
  "0xef78c93af44ef0c1fc18d5278060b9a681043fc942616d5e6bcd2231bac03552";

// ── mock StraitsX rail ─────────────────────────────────────────────────────
let fetchCalls: Array<{ paid: boolean; bodyAmountSgd: number }> = [];
let tamperChallenge = false;

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
    domain: AGENTPAY_DOMAIN,
    types: CONFIRMATION_TYPES,
    primaryType: "Confirmation",
    message,
  });
  return encodeToken({
    ...message,
    signature,
    signer: account.address,
  });
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
    check("names the owner rule", text.includes("registered owner"));
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

  console.log("S7 — amount outside the 5–30 SGD rail range");
  {
    const token = await makeToken({ merchant: "Book Store", amountCents: 300n });
    const { result, text } = await run({
      confirmation_token: token,
      merchant: "Book Store",
      amount_sgd: 3,
    });
    check("refused", result.isError === true);
    check("names the range", text.includes("5–30 SGD"));
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
          "signature recovers to the server wallet",
          recovered.toLowerCase() === serverAccount.address.toLowerCase(),
        );
      }
    }
  }

  console.log("S10 — REDACTION SWEEP: no credential material in any agent-visible output");
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
