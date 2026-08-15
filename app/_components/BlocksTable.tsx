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

export function BlocksTable({ blocks }: { blocks: RecentBlock[] }) {
  if (blocks.length === 0) {
    return (
      <p className="text-sm text-muted italic font-mono border-t border-ink/40 pt-6">
        No refusals in the current window. Try an attack via the MCP server:
        sign a Confirmation for one merchant, then call{" "}
        <code className="text-ink">execute_purchase</code> with a different
        merchant — the binding will refuse and a row will land here.
      </p>
    );
  }

  return (
    <div className="border border-rule overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-rule bg-ink/[0.03]">
            <th className="px-4 py-3 text-[10px] tracking-[0.18em] uppercase text-muted font-mono font-medium whitespace-nowrap">
              When
            </th>
            <th className="px-4 py-3 text-[10px] tracking-[0.18em] uppercase text-muted font-mono font-medium whitespace-nowrap">
              Reason
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
            const askedMerchant = shortenMerchant(b.merchant);
            const signedMerchant = shortenMerchant(b.signed_merchant);
            const hasSigned = b.signed_merchant != null;
            const merchantDiffers =
              hasSigned &&
              askedMerchant.toLowerCase() !== signedMerchant.toLowerCase();
            const amountDiffers =
              hasSigned && b.amount_sgd_cents !== b.signed_amount_sgd_cents;
            const label =
              (b.reason_code && REASON_LABEL[b.reason_code]) ??
              "Refused by AgentPay";
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
                  <TuplePair
                    merchant={askedMerchant}
                    amountCents={b.amount_sgd_cents}
                    merchantHighlight={merchantDiffers}
                    amountHighlight={amountDiffers}
                  />
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {hasSigned ? (
                    <TuplePair
                      merchant={signedMerchant}
                      amountCents={b.signed_amount_sgd_cents}
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
