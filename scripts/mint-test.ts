/**
 * StraitsX card API test mint via x402 (exact scheme, EIP-3009).
 *
 * Usage:
 *   tsx scripts/mint-test.ts sandbox --throwaway   # shape-check with a random key (no funds, expected to fail AFTER parsing)
 *   tsx scripts/mint-test.ts production            # REAL 1 XSGD spend from the wallet in .env
 *   tsx scripts/mint-test.ts production --dry      # sign but do not send the paid retry
 *
 * Safety by construction: the EIP-3009 authorization is scoped to exactly the
 * challenge amount (1 XSGD), exactly the challenge payTo, valid for 300s only.
 * Max exposure per run = 1 XSGD.
 */
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";

const env = process.argv[2] === "production" ? "production" : "sandbox";
const dry = process.argv.includes("--dry");
const throwaway = process.argv.includes("--throwaway");
const URL = `https://card.straitsx.ai/${env}/cardapi/issue_card`;

function loadEnvKey(): `0x${string}` {
  if (throwaway) {
    const k = generatePrivateKey();
    console.log("using THROWAWAY key (no funds, shape-check only)");
    return k;
  }
  let raw = "";
  try {
    raw = readFileSync(new globalThis.URL("../.env", import.meta.url), "utf8");
  } catch {
    console.error(
      "No .env file found. Create .env and set STRAITSX_PAYER_PRIVATE_KEY.",
    );
    process.exit(1);
  }
  const m = raw.match(
    /^(?:STRAITSX_PAYER_PRIVATE_KEY|WALLET_PRIVATE_KEY)=(0x[0-9a-fA-F]{64})\s*$/m,
  );
  if (!m) {
    console.error(
      ".env found but STRAITSX_PAYER_PRIVATE_KEY is missing or malformed (need 0x + 64 hex).",
    );
    process.exit(1);
  }
  return m[1] as `0x${string}`;
}

async function main() {
  console.log(`── env: ${env}  dry: ${dry}  url: ${URL}`);

  // Step 1 — fetch the x402 challenge
  const r1 = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const challenge = await r1.json();
  console.log(`── step 1: HTTP ${r1.status} challenge:`);
  console.log(JSON.stringify(challenge, null, 2));
  if (r1.status !== 402 || !challenge.accepts?.[0]) {
    console.error("Expected HTTP 402 with accepts[0]; aborting.");
    process.exit(1);
  }
  const acc = challenge.accepts[0];

  // Step 2 — sign EIP-3009 TransferWithAuthorization (EIP-712)
  const account = privateKeyToAccount(loadEnvKey());
  console.log(`── step 2: signing as ${account.address}`);
  const now = Math.floor(Date.now() / 1000);
  const authorization = {
    from: account.address,
    to: acc.payTo as `0x${string}`,
    value: BigInt(acc.amount),
    validAfter: 0n,
    validBefore: BigInt(now + (acc.maxTimeoutSeconds ?? 300)),
    nonce: `0x${randomBytes(32).toString("hex")}` as `0x${string}`,
  };
  const signature = await account.signTypedData({
    domain: {
      name: acc.extra?.name ?? "XSGD",
      version: acc.extra?.version ?? "2",
      chainId: acc.chainId,
      verifyingContract: acc.asset as `0x${string}`,
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

  // Step 3 — build the PAYMENT-SIGNATURE header.
  // StraitsX speaks transports-v2: the chosen accepts entry is echoed back as `accepted`.
  const paymentPayload = {
    x402Version: challenge.x402Version ?? 1,
    accepted: acc,
    payload: {
      signature,
      authorization: {
        from: authorization.from,
        to: authorization.to,
        value: acc.amount,
        validAfter: authorization.validAfter.toString(),
        validBefore: authorization.validBefore.toString(),
        nonce: authorization.nonce,
      },
    },
  };
  const header = Buffer.from(JSON.stringify(paymentPayload)).toString("base64");
  console.log(`── step 3: PAYMENT-SIGNATURE built (${header.length} chars)`);

  if (dry) {
    console.log("── DRY RUN: stopping before the paid retry. Payload below for inspection:");
    console.log(JSON.stringify(paymentPayload, null, 2));
    return;
  }

  // Step 4 — retry with payment
  const r2 = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "PAYMENT-SIGNATURE": header },
    body: "{}",
  });
  const text = await r2.text();
  console.log(`── step 4: HTTP ${r2.status}`);
  const pr = r2.headers.get("payment-response") ?? r2.headers.get("PAYMENT-RESPONSE");
  if (pr) {
    console.log("PAYMENT-RESPONSE header (decoded):");
    try {
      console.log(Buffer.from(pr, "base64").toString("utf8"));
    } catch {
      console.log(pr);
    }
  }
  try {
    console.log(JSON.stringify(JSON.parse(text), null, 2));
  } catch {
    console.log(text);
  }
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
