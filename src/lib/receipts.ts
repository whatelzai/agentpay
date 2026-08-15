// Receipt store: every Mint Gate outcome leaves a logged record.
// - MINTED: the proof chain (Tuple → settlement_tx → snowtrace link).
// - REFUSED: the Block Receipt — requested vs confirmed, reason, signed by
//   the server wallet (EIP-712) so a refusal is itself a verifiable artifact.
// In-memory per decision; console output doubles as the demo feed.

import { randomBytes } from "node:crypto";
import { serverWalletAccount } from "./straitsx/client";

export type ReceiptTuple = {
  merchant: string;
  amountSgdCents: string;
  expiryTimestamp: string;
  nonce: string;
};

export type MintReceipt = {
  id: string;
  type: "MINTED";
  tuple: ReceiptTuple;
  signer: string;
  amountSgd: string;
  settlementTx: string;
  snowtraceUrl: string;
  timestamp: string;
};

export type BlockReceipt = {
  id: string;
  type: "REFUSED";
  reason: string;
  requested: { merchant: string; amountSgdCents: string };
  confirmed: { merchant: string; amountSgdCents: string };
  timestamp: string;
  // EIP-712 signature by the server wallet over the refusal facts.
  // degraded=true when no server key is configured (verification-only deploys).
  signature?: `0x${string}`;
  signedBy?: string;
  degraded?: boolean;
};

export type Receipt = MintReceipt | BlockReceipt;

const receipts = ((globalThis as Record<string, unknown>).__agentpayReceipts ??=
  []) as Receipt[];

export const BLOCK_RECEIPT_DOMAIN = {
  name: "AgentPay BlockReceipt",
  version: "1",
  chainId: 43114,
} as const;

export const BLOCK_RECEIPT_TYPES = {
  BlockReceipt: [
    { name: "requestedMerchant", type: "string" },
    { name: "requestedAmountSgd", type: "uint256" },
    { name: "confirmedMerchant", type: "string" },
    { name: "confirmedAmountSgd", type: "uint256" },
    { name: "reason", type: "string" },
    { name: "timestamp", type: "uint256" },
  ],
} as const;

function newReceiptId(): string {
  return `rcpt_${randomBytes(8).toString("hex")}`;
}

export function recordMintReceipt(input: {
  tuple: ReceiptTuple;
  signer: string;
  amountSgd: string;
  settlementTx: string;
  snowtraceUrl: string;
}): MintReceipt {
  const receipt: MintReceipt = {
    id: newReceiptId(),
    type: "MINTED",
    ...input,
    timestamp: new Date().toISOString(),
  };
  receipts.push(receipt);
  console.log(`[agentpay] MINTED ${JSON.stringify(receipt)}`);
  return receipt;
}

export async function recordBlockReceipt(input: {
  reason: string;
  requested: { merchant?: string; amountSgdCents?: bigint };
  confirmed?: { merchant: string; amountSgdCents: bigint };
}): Promise<BlockReceipt> {
  const timestamp = new Date();
  const receipt: BlockReceipt = {
    id: newReceiptId(),
    type: "REFUSED",
    reason: input.reason,
    requested: {
      merchant: input.requested.merchant ?? "",
      amountSgdCents: (input.requested.amountSgdCents ?? 0n).toString(),
    },
    confirmed: {
      merchant: input.confirmed?.merchant ?? "",
      amountSgdCents: (input.confirmed?.amountSgdCents ?? 0n).toString(),
    },
    timestamp: timestamp.toISOString(),
  };

  const account = serverWalletAccount();
  if (account) {
    receipt.signature = await account.signTypedData({
      domain: BLOCK_RECEIPT_DOMAIN,
      types: BLOCK_RECEIPT_TYPES,
      primaryType: "BlockReceipt",
      message: {
        requestedMerchant: receipt.requested.merchant,
        requestedAmountSgd: BigInt(receipt.requested.amountSgdCents),
        confirmedMerchant: receipt.confirmed.merchant,
        confirmedAmountSgd: BigInt(receipt.confirmed.amountSgdCents),
        reason: receipt.reason,
        timestamp: BigInt(Math.floor(timestamp.getTime() / 1000)),
      },
    });
    receipt.signedBy = account.address;
  } else {
    receipt.degraded = true;
  }

  receipts.push(receipt);
  console.log(`[agentpay] REFUSED ${JSON.stringify(receipt)}`);
  return receipt;
}

export function getReceipt(id: string): Receipt | undefined {
  return receipts.find((r) => r.id === id);
}

export function latestReceipt(): Receipt | undefined {
  return receipts[receipts.length - 1];
}

export function listReceipts(): readonly Receipt[] {
  return receipts;
}
