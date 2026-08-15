// EIP-712 typed data schema for AgentPay confirmation binding.
//
// This is the cryptographic ground truth: a user's signature over
// (merchant, amountSgd, expiryTimestamp, nonce) that the mint layer
// verifies against the agent's actual mint request. Divergence = refused.

export const AGENTPAY_DOMAIN = {
  name: "AgentPay",
  version: "1",
  chainId: 43114, // Avalanche C-Chain Mainnet — the AgentPay rail
} as const;

export const CONFIRMATION_TYPES = {
  Confirmation: [
    { name: "merchant", type: "string" },
    { name: "amountSgd", type: "uint256" }, // in cents (5.50 SGD → 550)
    { name: "expiryTimestamp", type: "uint256" }, // unix seconds
    { name: "nonce", type: "bytes32" }, // random, prevents replay
  ],
} as const;

export type ConfirmationMessage = {
  merchant: string;
  amountSgd: bigint;
  expiryTimestamp: bigint;
  nonce: `0x${string}`;
};
