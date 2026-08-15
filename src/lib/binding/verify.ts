import { recoverTypedDataAddress } from "viem";
import { AGENTPAY_DOMAIN, CONFIRMATION_TYPES } from "./schema";

export type DecodedToken = {
  merchant: string;
  amountSgd: bigint;
  expiryTimestamp: bigint;
  nonce: `0x${string}`;
  signature: `0x${string}`;
  signer: `0x${string}`;
};

export type VerificationResult =
  | { valid: true; recoveredAddress: `0x${string}` }
  | { valid: false; reason: string };

export function encodeToken(payload: DecodedToken): string {
  return Buffer.from(
    JSON.stringify({
      merchant: payload.merchant,
      amountSgd: payload.amountSgd.toString(),
      expiryTimestamp: payload.expiryTimestamp.toString(),
      nonce: payload.nonce,
      signature: payload.signature,
      signer: payload.signer,
    }),
  ).toString("base64url");
}

export function decodeToken(token: string): DecodedToken {
  const raw = Buffer.from(token, "base64url").toString("utf8");
  const parsed = JSON.parse(raw) as Record<string, string>;
  if (
    !parsed.merchant ||
    !parsed.amountSgd ||
    !parsed.expiryTimestamp ||
    !parsed.nonce ||
    !parsed.signature ||
    !parsed.signer
  ) {
    throw new Error("token missing required fields");
  }
  return {
    merchant: parsed.merchant,
    amountSgd: BigInt(parsed.amountSgd),
    expiryTimestamp: BigInt(parsed.expiryTimestamp),
    nonce: parsed.nonce as `0x${string}`,
    signature: parsed.signature as `0x${string}`,
    signer: parsed.signer as `0x${string}`,
  };
}

export async function verifyConfirmation(
  decoded: DecodedToken,
): Promise<VerificationResult> {
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (decoded.expiryTimestamp < now) {
    return {
      valid: false,
      reason: `confirmation expired at ${new Date(Number(decoded.expiryTimestamp) * 1000).toISOString()}`,
    };
  }

  let recovered: `0x${string}`;
  try {
    recovered = await recoverTypedDataAddress({
      domain: AGENTPAY_DOMAIN,
      types: CONFIRMATION_TYPES,
      primaryType: "Confirmation",
      message: {
        merchant: decoded.merchant,
        amountSgd: decoded.amountSgd,
        expiryTimestamp: decoded.expiryTimestamp,
        nonce: decoded.nonce,
      },
      signature: decoded.signature,
    });
  } catch (e) {
    return { valid: false, reason: `signature recovery failed: ${(e as Error).message}` };
  }

  if (recovered.toLowerCase() !== decoded.signer.toLowerCase()) {
    return {
      valid: false,
      reason: `signature does not match claimed signer (recovered ${recovered}, claimed ${decoded.signer})`,
    };
  }

  return { valid: true, recoveredAddress: recovered };
}
