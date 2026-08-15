// EIP-712 typed data schema for AgentPay confirmation binding.
//
// Version 2 binds the purchase request to its payment authorization. The agent
// cannot replace the payer, rail, request id, or EIP-3009 authorization after
// the user signs.

export const LEGACY_AGENTPAY_DOMAIN = {
  name: "AgentPay",
  version: "1",
  chainId: 43114,
} as const;

export const LEGACY_CONFIRMATION_TYPES = {
  Confirmation: [
    { name: "merchant", type: "string" },
    { name: "amountSgd", type: "uint256" },
    { name: "expiryTimestamp", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

export function agentPayDomain(chainId: number) {
  return {
    name: "AgentPay",
    version: "2",
    chainId,
  } as const;
}

export const AGENTPAY_DOMAIN = agentPayDomain(43114);

export const CONFIRMATION_TYPES = {
  Confirmation: [
    { name: "requestId", type: "string" },
    { name: "merchant", type: "string" },
    { name: "amountSgd", type: "uint256" },
    { name: "expiryTimestamp", type: "uint256" },
    { name: "nonce", type: "bytes32" },
    { name: "paymentRail", type: "string" },
    { name: "payer", type: "address" },
    { name: "paymentAuthorizationHash", type: "bytes32" },
  ],
} as const;

export type ConfirmationMessage = {
  requestId: string;
  merchant: string;
  amountSgd: bigint;
  expiryTimestamp: bigint;
  nonce: `0x${string}`;
  paymentRail: string;
  payer: `0x${string}`;
  paymentAuthorizationHash: `0x${string}`;
};
