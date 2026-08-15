import { ConfirmClient } from "./ConfirmClient";

type SearchParams = Promise<{
  merchant?: string;
  amount?: string;
  expiry?: string;
  rid?: string;
}>;

export default async function Confirm({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { merchant, amount, expiry, rid } = await searchParams;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-xl mx-auto px-6 py-24">
        <p className="text-sm font-medium text-emerald-400 mb-4 tracking-wider uppercase">
          Confirmation
        </p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-8">
          Sign this purchase
        </h1>

        <div className="border border-neutral-800 rounded p-6 space-y-4 mb-8">
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">
              Merchant
            </p>
            <p className="text-lg">{merchant ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">
              Amount
            </p>
            <p className="text-lg">SGD {amount ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">
              Expires in
            </p>
            <p className="text-lg">{expiry ?? "300"} seconds</p>
          </div>
        </div>

        {merchant && amount ? (
          <ConfirmClient
            merchant={merchant}
            amount={amount}
            expirySeconds={expiry ?? "300"}
            requestId={rid}
          />
        ) : (
          <p className="text-sm text-red-400">
            Missing required URL params:{" "}
            <code className="text-xs">merchant</code> and{" "}
            <code className="text-xs">amount</code>. Ask your agent to call{" "}
            <code className="text-xs">propose_purchase</code> first.
          </p>
        )}

        <p className="text-xs text-neutral-600 mt-8">
          Your signature is a cryptographic commitment to (merchant, amount,
          expiry, nonce) via EIP-712 typed data. The card mint layer verifies
          this signature against the agent&apos;s mint request. Divergence
          refuses the mint. Prompt injection between signature and mint cannot
          hijack the purchase.
        </p>
      </div>
    </main>
  );
}
