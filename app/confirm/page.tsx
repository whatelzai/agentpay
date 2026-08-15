import type { Metadata } from "next";
import { ConfirmClient } from "./ConfirmClient";
import {
  SectionKicker,
  SiteFooter,
  SiteHeader,
  siteFrameClassName,
} from "../_components/SiteChrome";
import { configuredFundingMode } from "@/src/lib/payments/adapter";
import { STRAITSX_CHAIN_ID, straitsxEnv } from "@/src/lib/straitsx/client";

export const metadata: Metadata = {
  title: "Confirm purchase | AgentPay",
  description: "Review and sign an exact AgentPay purchase intent.",
};

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
  const hasRequiredParams = Boolean(merchant && amount && rid);
  // Only accept a same-origin relative path - never forward an open redirect.
  const returnTo =
    return_to && return_to.startsWith("/") && !return_to.startsWith("//")
      ? return_to
      : undefined;

  return (
    <main className="flex min-h-screen flex-col bg-void text-ink">
      <SiteHeader />
      <section className={`${siteFrameClassName} flex-1 py-16 md:py-24`}>
        <div className="max-w-xl">
          <SectionKicker>Confirmation</SectionKicker>
          <h1 className="mb-8 mt-6 font-body text-3xl font-semibold tracking-[-0.03em] md:text-5xl">
            Sign this purchase
          </h1>

          <div className="mb-8 flex flex-wrap items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.14em]">
            <span className="border border-neon bg-neon px-3 py-1.5 text-void">
              StraitsX Sandbox
            </span>
            <span className="border border-rule px-3 py-1.5 text-ink">
              Avalanche Fuji
            </span>
            <span className="text-muted">No real money</span>
          </div>

          <div className="mb-8 grid border border-rule sm:grid-cols-3">
            <div className="border-b border-rule sm:border-b-0 sm:border-r">
              <p className="border-b border-rule px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Merchant
              </p>
              <p className="min-w-0 break-words px-5 py-4 text-base">
                {merchant ?? "—"}
              </p>
            </div>
            <div className="border-b border-rule sm:border-b-0 sm:border-r">
              <p className="border-b border-rule px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Amount
              </p>
              <p className="px-5 py-4 text-base tabular-nums">
                SGD {amount ?? "—"}
              </p>
            </div>
            <div>
              <p className="border-b border-rule px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Expires in
              </p>
              <p className="px-5 py-4 text-base tabular-nums">
                {expiry ?? "300"} seconds
              </p>
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
            <p className="border border-seal/60 p-4 font-mono text-sm text-seal">
              This is not a complete confirmation URL. Ask your agent to call{" "}
              <code className="text-xs">propose_purchase</code> first.
            </p>
          )}

          <p className="mt-8 font-mono text-xs leading-relaxed text-muted">
            Your AgentPay signature commits to the request, merchant, amount,
            expiry, payer, rail, and exact payment authorization. The Mint Gate
            verifies every field against the agent&apos;s request. Divergence
            refuses the mint.
          </p>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
