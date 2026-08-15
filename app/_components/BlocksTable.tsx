import type { RecentBlock } from "@/src/lib/telemetry";

const REASON_LABEL: Record<string, string> = {
  tuple_diverged: "Agent asked to spend on a different merchant or amount",
  nonce_already_used: "Agent tried to reuse a spent confirmation",
  confirmation_sig_invalid: "Signature did not match the signed intent",
  payment_hash_swapped: "Payment authorization was swapped after signing",
  payment_proof_invalid: "Payment proof did not verify",
  signer_not_payer: "Confirming wallet is not the paying wallet",
  capability_open_failed: "Sealed capability could not be opened",
  token_decode_failed: "Confirmation token was malformed",
  unsealed_v2_token: "User-wallet confirmation was not AgentPay-sealed",
  amount_out_of_card_range: "Signed amount is outside the card rail range",
  chain_id_mismatch: "Confirmation chain does not match the rail",
  v1_signer_not_owner: "Signer is not the registered platform owner",
  v1_wrong_funding_mode: "Legacy confirmation used with wallet funding",
  v2_wrong_funding_mode: "User-wallet confirmation used with platform mode",
  demo_owner_unconfigured: "Platform-wallet owner is not configured",
  rail_config_failed: "Payment rail configuration failed closed",
  rail_failed_pre_payment: "Rail refused before any payment was sent",
};

type BlockClass = {
  label: string;
  tone: "risk" | "proof" | "policy" | "operational";
};

const REASON_CLASS: Record<string, BlockClass> = {
  tuple_diverged: { label: "Intent mismatch", tone: "risk" },
  nonce_already_used: { label: "Replay", tone: "risk" },
  payment_hash_swapped: { label: "Proof swapped", tone: "risk" },
  signer_not_payer: { label: "Signer mismatch", tone: "proof" },
  confirmation_sig_invalid: { label: "Invalid proof", tone: "proof" },
  payment_proof_invalid: { label: "Invalid proof", tone: "proof" },
  unsealed_v2_token: { label: "Protocol violation", tone: "proof" },
  amount_out_of_card_range: { label: "Rail limit refusal", tone: "operational" },
  capability_open_failed: { label: "Capability error", tone: "operational" },
  token_decode_failed: { label: "Capability error", tone: "operational" },
  chain_id_mismatch: { label: "Configuration", tone: "operational" },
  v1_signer_not_owner: { label: "Configuration", tone: "operational" },
  v1_wrong_funding_mode: { label: "Configuration", tone: "operational" },
  v2_wrong_funding_mode: { label: "Configuration", tone: "operational" },
  demo_owner_unconfigured: { label: "Configuration", tone: "operational" },
  rail_config_failed: { label: "Rail failure", tone: "operational" },
  rail_failed_pre_payment: { label: "Rail failure", tone: "operational" },
};

export function classifyBlockReason(reasonCode: string | null): BlockClass {
  return (
    (reasonCode ? REASON_CLASS[reasonCode] : undefined) ?? {
      label: "Safety refusal",
      tone: "policy",
    }
  );
}

const CLASS_STYLE: Record<BlockClass["tone"], string> = {
  risk: "border-seal/50 text-seal",
  proof: "border-amber-300/40 text-amber-300",
  policy: "border-ink/30 text-ink/70",
  operational: "border-rule text-muted",
};

function shortenMerchant(s: string | null): string {
  if (!s) return "—";
  const cleaned = s.replace(/[\x00-\x1f\x7f]/g, "").trim();
  return cleaned.length > 40 ? `${cleaned.slice(0, 40)}…` : cleaned || "—";
}

function formatSgd(cents: number | null): string {
  if (cents == null) return "—";
  return `SGD ${(cents / 100).toFixed(2)}`;
}

function timeAgo(iso: string): string {
  const seconds = Math.max(
    1,
    Math.floor((Date.now() - new Date(iso).getTime()) / 1000),
  );
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function TuplePair({
  merchant,
  amountCents,
  merchantHighlight,
  amountHighlight,
}: {
  merchant: string;
  amountCents: number | null;
  merchantHighlight: boolean;
  amountHighlight: boolean;
}) {
  return (
    <span className="font-mono text-sm break-words">
      <span className={merchantHighlight ? "text-neon" : "text-ink"}>
        {merchant}
      </span>
      <span className="text-muted"> · </span>
      <span className={amountHighlight ? "text-neon" : "text-ink"}>
        {formatSgd(amountCents)}
      </span>
    </span>
  );
}

export function BlocksTable({
  blocks,
  revealPurchaseDetails = true,
}: {
  blocks: RecentBlock[] | null;
  revealPurchaseDetails?: boolean;
}) {
  if (blocks === null) {
    return (
      <p className="text-sm text-muted font-mono border border-rule p-6">
        Refusal telemetry is unavailable. No safety conclusion is inferred from
        the missing feed.
      </p>
    );
  }

  if (blocks.length === 0) {
    return (
      <p className="text-sm text-muted italic font-mono border-t border-ink/40 pt-6">
        No refusals were returned in the recent sample. This is not treated as
        proof of safety without the observed-decision count above.
      </p>
    );
  }

  return (
    <div className="border border-rule overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <caption className="sr-only">
          Recent AgentPay safety refusals and their classification
        </caption>
        <thead>
          <tr className="border-b border-rule bg-ink/[0.03]">
            <th className="px-4 py-3 text-[10px] tracking-[0.18em] uppercase text-muted font-mono font-medium whitespace-nowrap">
              When
            </th>
            <th className="px-4 py-3 text-[10px] tracking-[0.18em] uppercase text-muted font-mono font-medium whitespace-nowrap">
              Reason
            </th>
            <th className="px-4 py-3 text-[10px] tracking-[0.18em] uppercase text-muted font-mono font-medium whitespace-nowrap">
              Class
            </th>
            <th className="px-4 py-3 text-[10px] tracking-[0.18em] uppercase text-muted font-mono font-medium whitespace-nowrap">
              Agent asked
            </th>
            <th className="px-4 py-3 text-[10px] tracking-[0.18em] uppercase text-muted font-mono font-medium whitespace-nowrap">
              Human signed
            </th>
            <th className="px-4 py-3 text-[10px] tracking-[0.18em] uppercase text-muted font-mono font-medium">
              Why
            </th>
          </tr>
        </thead>
        <tbody>
          {blocks.map((b) => {
            const askedMerchant = revealPurchaseDetails
              ? shortenMerchant(b.merchant)
              : "Redacted";
            const signedMerchant = revealPurchaseDetails
              ? shortenMerchant(b.signed_merchant)
              : "Redacted";
            const hasSigned = b.signed_merchant != null;
            const merchantDiffers =
              revealPurchaseDetails &&
              hasSigned &&
              askedMerchant.toLowerCase() !== signedMerchant.toLowerCase();
            const amountDiffers =
              revealPurchaseDetails &&
              hasSigned &&
              b.amount_sgd_cents !== b.signed_amount_sgd_cents;
            const label =
              (b.reason_code && REASON_LABEL[b.reason_code]) ??
              "Refused by AgentPay";
            const classification = classifyBlockReason(b.reason_code);
            return (
              <tr
                key={b.correlation_id + b.created_at}
                className="border-b border-rule last:border-b-0 align-top"
              >
                <td className="px-4 py-4 text-[11px] font-mono text-muted whitespace-nowrap">
                  {timeAgo(b.created_at)} ago
                </td>
                <td className="px-4 py-4 text-[11px] font-mono text-muted whitespace-nowrap">
                  {b.reason_code ?? "refused"}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span
                    className={`inline-block border px-2 py-1 text-[9px] tracking-[0.12em] uppercase font-mono ${CLASS_STYLE[classification.tone]}`}
                  >
                    {classification.label}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <TuplePair
                    merchant={askedMerchant}
                    amountCents={
                      revealPurchaseDetails ? b.amount_sgd_cents : null
                    }
                    merchantHighlight={merchantDiffers}
                    amountHighlight={amountDiffers}
                  />
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {hasSigned ? (
                    <TuplePair
                      merchant={signedMerchant}
                      amountCents={
                        revealPurchaseDetails
                          ? b.signed_amount_sgd_cents
                          : null
                      }
                      merchantHighlight={merchantDiffers}
                      amountHighlight={amountDiffers}
                    />
                  ) : (
                    <span className="text-muted font-mono text-sm">—</span>
                  )}
                </td>
                <td className="px-4 py-4 text-sm text-ink/80 leading-snug">
                  {label}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
