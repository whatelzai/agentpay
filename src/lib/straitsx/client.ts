import { randomBytes } from "node:crypto";
import { getAddress, isAddress, recoverTypedDataAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  paymentAuthorizationHash,
  transferAuthorizationTypedData,
  type StraitsXPaymentIntent,
  type StraitsXPaymentProof,
  type X402Accepted,
} from "../payments/eip3009";

export type StraitsXEnv = "sandbox" | "production";

export const STRAITSX_CHAIN_ID: Record<StraitsXEnv, number> = {
  sandbox: 43113,
  production: 43114,
};

export const XSGD_ASSET: Record<StraitsXEnv, `0x${string}`> = {
  sandbox: "0xd769410dc8772695A7f55a304d2125320A65c2a5",
  production: "0xb2F85b7AB3c2b6f62DF06dE6aE7D09c010a5096E",
};

const XSGD_UNITS_PER_CENT = 10_000n;
const MAX_PAYMENT_LIFETIME_SECONDS = 300;
const CLOCK_SKEW_SECONDS = 30;

export type MintRequest = {
  amountCents: bigint;
  cardholderName: string;
  env: StraitsXEnv;
};

export type PrepareMintRequest = {
  amountCents: bigint;
  cardholderName: string;
  environment: StraitsXEnv;
  payerAddress: `0x${string}`;
};

export type UserFundedMintRequest = PrepareMintRequest & {
  proof: StraitsXPaymentProof;
};

export type MintSuccess = {
  ok: true;
  amountSgd: string;
  settlementTx: string;
  snowtraceUrl: string;
  cardOpaqueId: string;
  iframeUrl?: string;
};

export type MintFailure = {
  ok: false;
  reason: string;
  paymentAttempted: boolean;
};
export type MintResult = MintSuccess | MintFailure;
export type PrepareMintResult =
  | {
      ok: true;
      intent: StraitsXPaymentIntent;
      authorizationHash: `0x${string}`;
    }
  | MintFailure;

type X402Challenge = {
  x402Version?: number;
  accepts?: unknown[];
};

export function straitsxEnv(): StraitsXEnv {
  return process.env.STRAITSX_ENV === "production" ? "production" : "sandbox";
}

export function snowtraceTxUrl(env: StraitsXEnv, tx: string): string {
  return env === "production"
    ? `https://snowtrace.io/tx/${tx}`
    : `https://testnet.snowtrace.io/tx/${tx}`;
}

function loadPlatformPayerKey(): `0x${string}` | null {
  const key =
    process.env.STRAITSX_PAYER_PRIVATE_KEY ?? process.env.WALLET_PRIVATE_KEY;
  if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key)) return null;
  return key as `0x${string}`;
}

export function platformPayerAccount() {
  const key = loadPlatformPayerKey();
  return key ? privateKeyToAccount(key) : null;
}

function issueCardUrl(environment: StraitsXEnv): string {
  return `https://card.straitsx.ai/${environment}/cardapi/issue_card`;
}

function issueCardBody(input: PrepareMintRequest): string {
  return JSON.stringify({
    amount_sgd: Number(input.amountCents) / 100,
    cardholder_name: input.cardholderName,
    wallet_address: input.payerAddress,
  });
}

function parseAccepted(value: unknown): X402Accepted | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const accepted = value as Record<string, unknown>;
  if (
    typeof accepted.chainId !== "number" ||
    !Number.isInteger(accepted.chainId) ||
    typeof accepted.asset !== "string" ||
    typeof accepted.amount !== "string" ||
    typeof accepted.payTo !== "string" ||
    !isAddress(accepted.asset, { strict: false }) ||
    !isAddress(accepted.payTo, { strict: false })
  ) {
    return null;
  }
  if (
    accepted.maxTimeoutSeconds !== undefined &&
    (typeof accepted.maxTimeoutSeconds !== "number" ||
      !Number.isInteger(accepted.maxTimeoutSeconds) ||
      accepted.maxTimeoutSeconds <= 0)
  ) {
    return null;
  }
  if (accepted.scheme !== undefined && typeof accepted.scheme !== "string") {
    return null;
  }
  if (accepted.extra !== undefined) {
    if (
      !accepted.extra ||
      typeof accepted.extra !== "object" ||
      Array.isArray(accepted.extra)
    ) {
      return null;
    }
    const extra = accepted.extra as Record<string, unknown>;
    if (
      (extra.name !== undefined && typeof extra.name !== "string") ||
      (extra.version !== undefined && typeof extra.version !== "string")
    ) {
      return null;
    }
  }
  return accepted as X402Accepted;
}

function expectedXsgdUnits(amountCents: bigint): bigint {
  return amountCents * XSGD_UNITS_PER_CENT;
}

export function validatePaymentIntent(
  intent: StraitsXPaymentIntent,
  expected: {
    amountCents: bigint;
    environment: StraitsXEnv;
    payerAddress: `0x${string}`;
    requireLiveAuthorization?: boolean;
  },
): string | null {
  if (!intent || typeof intent !== "object" || Array.isArray(intent)) {
    return "payment proof has a malformed intent";
  }
  const rawIntent = intent as unknown as Record<string, unknown>;
  if (rawIntent.rail !== "straitsx") {
    return "payment proof is not for the StraitsX rail";
  }
  if (rawIntent.environment !== expected.environment) {
    return `payment environment ${String(rawIntent.environment)} does not match ${expected.environment}`;
  }
  if (rawIntent.x402Version !== 1) {
    return `unsupported x402 version ${String(rawIntent.x402Version)}`;
  }
  const rawAuthorization = rawIntent.authorization;
  if (
    !rawAuthorization ||
    typeof rawAuthorization !== "object" ||
    Array.isArray(rawAuthorization)
  ) {
    return "payment proof has a malformed authorization";
  }
  const authorization = rawAuthorization as Record<string, unknown>;
  if (
    typeof authorization.from !== "string" ||
    typeof authorization.to !== "string" ||
    typeof authorization.value !== "string" ||
    typeof authorization.validAfter !== "string" ||
    typeof authorization.validBefore !== "string" ||
    typeof authorization.nonce !== "string" ||
    !isAddress(authorization.from, { strict: false }) ||
    !isAddress(authorization.to, { strict: false })
  ) {
    return "payment proof has malformed authorization fields";
  }

  const accepted = parseAccepted(rawIntent.accepted);
  if (!accepted) return "payment proof has a malformed x402 accepted entry";
  if (accepted.scheme !== undefined && accepted.scheme !== "exact") {
    return `unsupported x402 scheme ${accepted.scheme}`;
  }
  if (
    accepted.extra?.name !== undefined &&
    accepted.extra.name !== "XSGD"
  ) {
    return "payment challenge has an unexpected token domain name";
  }
  if (
    accepted.extra?.version !== undefined &&
    accepted.extra.version !== "2"
  ) {
    return "payment challenge has an unexpected token domain version";
  }
  if (accepted.chainId !== STRAITSX_CHAIN_ID[expected.environment]) {
    return `payment chainId ${accepted.chainId} does not match ${STRAITSX_CHAIN_ID[expected.environment]}`;
  }
  if (
    accepted.asset.toLowerCase() !==
    XSGD_ASSET[expected.environment].toLowerCase()
  ) {
    return "payment asset is not the expected XSGD contract";
  }

  const expectedUnits = expectedXsgdUnits(expected.amountCents);
  let acceptedUnits: bigint;
  let authorizedUnits: bigint;
  let validAfter: bigint;
  let validBefore: bigint;
  try {
    acceptedUnits = BigInt(accepted.amount);
    authorizedUnits = BigInt(authorization.value as string);
    validAfter = BigInt(authorization.validAfter as string);
    validBefore = BigInt(authorization.validBefore as string);
  } catch {
    return "payment proof contains a non-numeric authorization value";
  }
  if (acceptedUnits !== expectedUnits) {
    return `payment challenge demands ${acceptedUnits} XSGD units; the Tuple allows exactly ${expectedUnits}`;
  }
  if (authorizedUnits !== expectedUnits) {
    return `payment authorizes ${authorizedUnits} XSGD units; the Tuple allows exactly ${expectedUnits}`;
  }
  if (
    (authorization.from as string).toLowerCase() !==
    expected.payerAddress.toLowerCase()
  ) {
    return "payment payer does not match the confirmed wallet";
  }
  if (
    (authorization.to as string).toLowerCase() !== accepted.payTo.toLowerCase()
  ) {
    return "payment recipient does not match the x402 challenge";
  }
  if (!/^0x[0-9a-fA-F]{64}$/.test(authorization.nonce as string)) {
    return "payment authorization nonce is malformed";
  }
  if (validAfter !== 0n) {
    return "payment authorization has an unsupported start time";
  }
  if (validBefore <= validAfter) {
    return "payment authorization has an invalid validity window";
  }

  if (expected.requireLiveAuthorization !== false) {
    const now = BigInt(Math.floor(Date.now() / 1000));
    if (validBefore <= now) return "payment authorization has expired";
    if (
      validBefore >
      now + BigInt(MAX_PAYMENT_LIFETIME_SECONDS + CLOCK_SKEW_SECONDS)
    ) {
      return "payment authorization lifetime is longer than AgentPay allows";
    }
  }
  return null;
}

export async function verifyPaymentProof(
  proof: StraitsXPaymentProof,
  expected: {
    amountCents: bigint;
    environment: StraitsXEnv;
    payerAddress: `0x${string}`;
  },
): Promise<
  { valid: true; authorizationHash: `0x${string}` } | MintFailure
> {
  if (!proof || typeof proof !== "object" || Array.isArray(proof)) {
    return { ok: false, reason: "payment proof is malformed", paymentAttempted: false };
  }
  if (typeof proof.signature !== "string" || !/^0x[0-9a-fA-F]+$/.test(proof.signature)) {
    return { ok: false, reason: "payment signature is malformed", paymentAttempted: false };
  }

  try {
    const reason = validatePaymentIntent(proof.intent, expected);
    if (reason) return { ok: false, reason, paymentAttempted: false };
    const recovered = await recoverTypedDataAddress({
      ...transferAuthorizationTypedData(proof.intent),
      signature: proof.signature,
    });
    if (recovered.toLowerCase() !== expected.payerAddress.toLowerCase()) {
      return {
        ok: false,
        reason: `payment signature recovers to ${recovered}, not the confirmed payer`,
        paymentAttempted: false,
      };
    }
    return {
      valid: true,
      authorizationHash: paymentAuthorizationHash(proof.intent),
    };
  } catch (error) {
    return {
      ok: false,
      reason: `payment signature recovery failed: ${(error as Error).message}`,
      paymentAttempted: false,
    };
  }
}

export async function prepareCardMint(
  input: PrepareMintRequest,
): Promise<PrepareMintResult> {
  if (!isAddress(input.payerAddress, { strict: false })) {
    return { ok: false, reason: "payer address is malformed", paymentAttempted: false };
  }

  let status: number;
  let challenge: X402Challenge;
  try {
    const response = await fetch(issueCardUrl(input.environment), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: issueCardBody(input),
    });
    status = response.status;
    challenge = (await response.json()) as X402Challenge;
  } catch (error) {
    return {
      ok: false,
      reason: `challenge request failed: ${(error as Error).message}`,
      paymentAttempted: false,
    };
  }

  const accepted = parseAccepted(challenge.accepts?.[0]);
  if (status !== 402 || !accepted) {
    return {
      ok: false,
      reason: `expected a valid HTTP 402 challenge, got HTTP ${status}`,
      paymentAttempted: false,
    };
  }

  const timeout = Math.min(
    accepted.maxTimeoutSeconds ?? MAX_PAYMENT_LIFETIME_SECONDS,
    MAX_PAYMENT_LIFETIME_SECONDS,
  );
  const now = Math.floor(Date.now() / 1000);
  const intent: StraitsXPaymentIntent = {
    rail: "straitsx",
    environment: input.environment,
    x402Version: challenge.x402Version ?? 1,
    accepted,
    authorization: {
      from: getAddress(input.payerAddress.toLowerCase()),
      to: getAddress(accepted.payTo.toLowerCase()),
      value: expectedXsgdUnits(input.amountCents).toString(),
      validAfter: "0",
      validBefore: String(now + timeout),
      nonce: `0x${randomBytes(32).toString("hex")}`,
    },
  };

  const reason = validatePaymentIntent(intent, {
    amountCents: input.amountCents,
    environment: input.environment,
    payerAddress: input.payerAddress,
  });
  if (reason) {
    return {
      ok: false,
      reason: `unsafe x402 challenge: ${reason}`,
      paymentAttempted: false,
    };
  }

  return {
    ok: true,
    intent,
    authorizationHash: paymentAuthorizationHash(intent),
  };
}

async function submitCardMint(
  input: PrepareMintRequest,
  proof: StraitsXPaymentProof,
): Promise<MintResult> {
  const paymentPayload = {
    x402Version: proof.intent.x402Version,
    accepted: proof.intent.accepted,
    payload: {
      signature: proof.signature,
      authorization: proof.intent.authorization,
    },
  };
  const paymentHeader = Buffer.from(
    JSON.stringify(paymentPayload),
  ).toString("base64");

  let response: Response;
  let rawText: string;
  try {
    response = await fetch(issueCardUrl(input.environment), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "PAYMENT-SIGNATURE": paymentHeader,
      },
      body: issueCardBody(input),
    });
    rawText = await response.text();
  } catch (error) {
    return {
      ok: false,
      reason: `paid mint request failed: ${(error as Error).message}`,
      paymentAttempted: true,
    };
  }
  let card: Record<string, unknown> = {};
  try {
    card = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    // A paid request with an empty or malformed response is still consumed.
  }
  if (response.status !== 200) {
    return {
      ok: false,
      reason: `mint rejected after payment: HTTP ${response.status}`,
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
        : (Number(input.amountCents) / 100).toFixed(2),
    settlementTx,
    snowtraceUrl: snowtraceTxUrl(input.environment, settlementTx),
    cardOpaqueId,
    iframeUrl:
      typeof card.iframe_url === "string" ? card.iframe_url : undefined,
  };
}

export async function mintCardWithPaymentProof(
  input: UserFundedMintRequest,
): Promise<MintResult> {
  const verification = await verifyPaymentProof(input.proof, {
    amountCents: input.amountCents,
    environment: input.environment,
    payerAddress: input.payerAddress,
  });
  if (!("valid" in verification)) return verification;
  return submitCardMint(input, input.proof);
}

export async function mintCard(request: MintRequest): Promise<MintResult> {
  const account = platformPayerAccount();
  if (!account) {
    return {
      ok: false,
      reason: "platform payer key is not configured",
      paymentAttempted: false,
    };
  }

  const input: PrepareMintRequest = {
    amountCents: request.amountCents,
    cardholderName: request.cardholderName,
    environment: request.env,
    payerAddress: account.address,
  };
  const prepared = await prepareCardMint(input);
  if (!prepared.ok) return prepared;

  const signature = await account.signTypedData(
    transferAuthorizationTypedData(prepared.intent),
  );
  return submitCardMint(input, { intent: prepared.intent, signature });
}
