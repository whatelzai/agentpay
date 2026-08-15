import { ConfirmClient } from "./ConfirmClient";
import { configuredFundingMode } from "@/src/lib/payments/adapter";
import { STRAITSX_CHAIN_ID, straitsxEnv } from "@/src/lib/straitsx/client";

type SearchParams = Promise<{
  merchant?: string;
  amount?: string;
  expiry?: string;
  rid?: string;
  return_to?: string;
}>;

export default async function Confirm({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { merchant, amount, expiry, rid, return_to } = await searchParams;
  const fundingMode = configuredFundingMode();
  const chainId = STRAITSX_CHAIN_ID[straitsxEnv()] as 43113 | 43114;
  const hasRequiredParams =
    Boolean(merchant && amount && rid);
  // Only accept a same-origin relative path - never forward an open redirect.
  const returnTo =
    return_to && return_to.startsWith("/") && !return_to.startsWith("//")
      ? return_to
      : undefined;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-xl mx-auto px-6 py-24">
        <div className="mb-8 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em]">
          <span className="rounded-full bg-emerald-500 px-3 py-1.5 text-black">
            StraitsX Sandbox
          </span>
          <span className="rounded-full border border-neutral-700 px-3 py-1.5 text-neutral-300">
            Avalanche Fuji
          </span>
          <span className="text-neutral-500">No real money</span>
        </div>
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

        {hasRequiredParams && merchant && amount ? (
          <ConfirmClient
            merchant={merchant}
            amount={amount}
            expirySeconds={expiry ?? "300"}
            requestId={rid}
            fundingMode={fundingMode}
            chainId={chainId}
            returnTo={returnTo}
          />
        ) : (
          <p className="text-sm text-red-400">
            This is not a complete confirmation URL. Ask your agent to call{" "}
            <code className="text-xs">propose_purchase</code> first.
          </p>
        )}

        <p className="text-xs text-neutral-600 mt-8">
          Your AgentPay signature commits to the request, merchant, amount,
          expiry, payer, rail, and exact payment authorization. The Mint Gate
          verifies every field against the agent&apos;s request. Divergence refuses
          the mint.
        </p>
      </div>
    </main>
  );
}
