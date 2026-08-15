import { getAddress, hashTypedData } from "viem";

export const TRANSFER_WITH_AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

export type TransferAuthorization = {
  from: `0x${string}`;
  to: `0x${string}`;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: `0x${string}`;
};

export type X402Accepted = Record<string, unknown> & {
  scheme?: string;
  chainId: number;
  asset: `0x${string}`;
  amount: string;
  payTo: `0x${string}`;
  maxTimeoutSeconds?: number;
  extra?: { name?: string; version?: string };
};

export type StraitsXPaymentIntent = {
  rail: "straitsx";
  environment: "sandbox" | "production";
  x402Version: number;
  accepted: X402Accepted;
  authorization: TransferAuthorization;
};

export type StraitsXPaymentProof = {
  intent: StraitsXPaymentIntent;
  signature: `0x${string}`;
};

export function transferAuthorizationTypedData(intent: StraitsXPaymentIntent) {
  return {
    domain: {
      name: "XSGD",
      version: "2",
      chainId: intent.accepted.chainId,
      verifyingContract: getAddress(intent.accepted.asset.toLowerCase()),
    },
    types: TRANSFER_WITH_AUTHORIZATION_TYPES,
    primaryType: "TransferWithAuthorization" as const,
    message: {
      from: intent.authorization.from,
      to: intent.authorization.to,
      value: BigInt(intent.authorization.value),
      validAfter: BigInt(intent.authorization.validAfter),
      validBefore: BigInt(intent.authorization.validBefore),
      nonce: intent.authorization.nonce,
    },
  };
}

export function paymentAuthorizationHash(
  intent: StraitsXPaymentIntent,
): `0x${string}` {
  return hashTypedData(transferAuthorizationTypedData(intent));
}
