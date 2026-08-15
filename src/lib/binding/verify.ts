import {
  createPublicClient,
  http,
  isAddress,
  recoverTypedDataAddress,
} from "viem";
import { avalanche, avalancheFuji } from "viem/chains";
import type { StraitsXPaymentProof } from "../payments/eip3009";
import {
  agentPayDomain,
  CONFIRMATION_TYPES,
  LEGACY_AGENTPAY_DOMAIN,
  LEGACY_CONFIRMATION_TYPES,
} from "./schema";

type TokenCore = {
  merchant: string;
  amountSgd: bigint;
  expiryTimestamp: bigint;
  nonce: `0x${string}`;
  signature: `0x${string}`;
  signer: `0x${string}`;
};

export type LegacyDecodedToken = TokenCore & {
  version: 1;
};

export type UserWalletDecodedToken = TokenCore & {
  version: 2;
  requestId: string;
  chainId: 43113 | 43114;
  paymentRail: "straitsx";
  payer: `0x${string}`;
  paymentAuthorizationHash: `0x${string}`;
  paymentProof: StraitsXPaymentProof;
};

export type DecodedToken = LegacyDecodedToken | UserWalletDecodedToken;

export type VerificationResult =
  | {
      valid: true;
      recoveredAddress: `0x${string}`;
      method: "eoa" | "erc1271";
    }
  | { valid: false; reason: string };

function tokenJson(payload: DecodedToken): Record<string, unknown> {
  const core = {
    version: payload.version,
    merchant: payload.merchant,
    amountSgd: payload.amountSgd.toString(),
    expiryTimestamp: payload.expiryTimestamp.toString(),
    nonce: payload.nonce,
    signature: payload.signature,
    signer: payload.signer,
  };
  if (payload.version === 1) return core;
  return {
    ...core,
    requestId: payload.requestId,
    chainId: payload.chainId,
    paymentRail: payload.paymentRail,
    payer: payload.payer,
    paymentAuthorizationHash: payload.paymentAuthorizationHash,
    paymentProof: payload.paymentProof,
  };
}

export function encodeToken(payload: DecodedToken): string {
  const bytes = new TextEncoder().encode(JSON.stringify(tokenJson(payload)));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function fromBase64Url(encoded: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(encoded) || encoded.length % 4 === 1) {
    throw new Error("invalid base64url encoding");
  }
  const base64 =
    encoded.replaceAll("-", "+").replaceAll("_", "/") +
    "=".repeat((4 - (encoded.length % 4)) % 4);
  const binary = atob(base64);
  const decoded = new TextDecoder("utf-8", { fatal: true }).decode(
    Uint8Array.from(binary, (character) => character.charCodeAt(0)),
  );
  if (encodeTokenJson(decoded) !== encoded) {
    throw new Error("non-canonical base64url encoding");
  }
  return decoded;
}

function encodeTokenJson(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function requiredString(
  parsed: Record<string, unknown>,
  key: string,
): string {
  const value = parsed[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`token missing ${key}`);
  }
  return value;
}

function parseCore(parsed: Record<string, unknown>): TokenCore {
  const merchant = requiredString(parsed, "merchant");
  if (merchant.length > 256) throw new Error("token merchant is too long");
  const nonce = requiredString(parsed, "nonce");
  const signature = requiredString(parsed, "signature");
  const signer = requiredString(parsed, "signer");
  if (!/^0x[0-9a-fA-F]{64}$/.test(nonce)) {
    throw new Error("token nonce is malformed");
  }
  if (!/^0x[0-9a-fA-F]+$/.test(signature)) {
    throw new Error("token signature is malformed");
  }
  if (!isAddress(signer)) throw new Error("token signer is malformed");

  try {
    return {
      merchant,
      amountSgd: BigInt(requiredString(parsed, "amountSgd")),
      expiryTimestamp: BigInt(requiredString(parsed, "expiryTimestamp")),
      nonce: nonce as `0x${string}`,
      signature: signature as `0x${string}`,
      signer: signer as `0x${string}`,
    };
  } catch (error) {
    if ((error as Error).message.startsWith("token missing")) throw error;
    throw new Error("token amount or expiry is malformed");
  }
}

function parsePaymentProof(value: unknown): StraitsXPaymentProof {
  if (!value || typeof value !== "object") {
    throw new Error("token paymentProof is malformed");
  }
  const proof = value as Record<string, unknown>;
  if (
    !proof.intent ||
    typeof proof.intent !== "object" ||
    typeof proof.signature !== "string"
  ) {
    throw new Error("token paymentProof is malformed");
  }
  return proof as StraitsXPaymentProof;
}

export function decodeToken(token: string): DecodedToken {
  if (token.length > 16_384) throw new Error("token is too large");
  let parsed: Record<string, unknown>;
  try {
    const raw = fromBase64Url(token);
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error("token is not valid base64url JSON");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("token payload is malformed");
  }

  const core = parseCore(parsed);
  if (parsed.version !== 2) return { version: 1, ...core };

  const requestId = requiredString(parsed, "requestId");
  const paymentRail = requiredString(parsed, "paymentRail");
  const payer = requiredString(parsed, "payer");
  const authorizationHash = requiredString(
    parsed,
    "paymentAuthorizationHash",
  );
  if (!/^req_[0-9a-f]{16}$/.test(requestId)) {
    throw new Error("token requestId is malformed");
  }
  if (parsed.chainId !== 43113 && parsed.chainId !== 43114) {
    throw new Error("token chainId is unsupported");
  }
  if (paymentRail !== "straitsx") {
    throw new Error("token paymentRail is unsupported");
  }
  if (!isAddress(payer)) throw new Error("token payer is malformed");
  if (!/^0x[0-9a-fA-F]{64}$/.test(authorizationHash)) {
    throw new Error("token paymentAuthorizationHash is malformed");
  }

  return {
    version: 2,
    ...core,
    requestId,
    chainId: parsed.chainId,
    paymentRail,
    payer: payer as `0x${string}`,
    paymentAuthorizationHash: authorizationHash as `0x${string}`,
    paymentProof: parsePaymentProof(parsed.paymentProof),
  };
}

function legacyConfirmationTypedData(decoded: LegacyDecodedToken) {
  return {
    domain: LEGACY_AGENTPAY_DOMAIN,
    types: LEGACY_CONFIRMATION_TYPES,
    primaryType: "Confirmation" as const,
    message: {
      merchant: decoded.merchant,
      amountSgd: decoded.amountSgd,
      expiryTimestamp: decoded.expiryTimestamp,
      nonce: decoded.nonce,
    },
  };
}

function userConfirmationTypedData(decoded: UserWalletDecodedToken) {
  return {
    domain: agentPayDomain(decoded.chainId),
    types: CONFIRMATION_TYPES,
    primaryType: "Confirmation" as const,
    message: {
      requestId: decoded.requestId,
      merchant: decoded.merchant,
      amountSgd: decoded.amountSgd,
      expiryTimestamp: decoded.expiryTimestamp,
      nonce: decoded.nonce,
      paymentRail: decoded.paymentRail,
      payer: decoded.payer,
      paymentAuthorizationHash: decoded.paymentAuthorizationHash,
    },
  };
}

async function verifySmartWalletSignature(
  decoded: UserWalletDecodedToken,
): Promise<boolean> {
  if (process.env.AGENTPAY_ENABLE_ERC1271 !== "true") return false;
  const chain = decoded.chainId === 43114 ? avalanche : avalancheFuji;
  const rpc =
    decoded.chainId === 43114
      ? process.env.AVALANCHE_MAINNET_RPC
      : process.env.AVALANCHE_FUJI_RPC;
  const client = createPublicClient({ chain, transport: http(rpc) });
  return client.verifyTypedData({
    address: decoded.signer,
    ...userConfirmationTypedData(decoded),
    signature: decoded.signature,
  });
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

  try {
    const recovered =
      decoded.version === 1
        ? await recoverTypedDataAddress({
            ...legacyConfirmationTypedData(decoded),
            signature: decoded.signature,
          })
        : await recoverTypedDataAddress({
            ...userConfirmationTypedData(decoded),
            signature: decoded.signature,
          });
    if (recovered.toLowerCase() === decoded.signer.toLowerCase()) {
      return {
        valid: true,
        recoveredAddress: recovered,
        method: "eoa",
      };
    }
  } catch {
    // Smart-wallet signatures may not be recoverable as an EOA signature.
  }

  if (decoded.version === 2) {
    try {
      if (await verifySmartWalletSignature(decoded)) {
        return {
          valid: true,
          recoveredAddress: decoded.signer,
          method: "erc1271",
        };
      }
    } catch (error) {
      return {
        valid: false,
        reason: `smart-wallet signature verification failed: ${(error as Error).message}`,
      };
    }
  }

  return {
    valid: false,
    reason: "signature does not match the claimed signer",
  };
}
