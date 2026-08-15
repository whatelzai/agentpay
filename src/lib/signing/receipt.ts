import { privateKeyToAccount } from "viem/accounts";

function loadReceiptSignerKey(): `0x${string}` | null {
  const key = process.env.RECEIPT_SIGNER_PRIVATE_KEY;
  if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key)) return null;
  return key as `0x${string}`;
}

export function receiptSignerAccount() {
  const key = loadReceiptSignerKey();
  return key ? privateKeyToAccount(key) : null;
}
