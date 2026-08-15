"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getStoreProduct, formatSgd } from "@/src/lib/store/products";

type OrderReceipt = {
  type: "MINTED" | "REFUSED";
  settlementTx?: string;
  snowtraceUrl?: string;
  amountSgd?: string;
  reason?: string;
  requested?: { merchant: string; amountSgdCents: string };
  confirmed?: { merchant: string; amountSgdCents: string };
};

type OrderResponse = {
  status: "awaiting_signature" | "settled" | "refused" | "rail_failed";
  order?: { slug: string; merchant: string; amountSgd: number };
  receipt?: OrderReceipt;
  detail?: string;
};

const POLL_MS = 2500;
// The checkout POST and this GET can land on different serverless
// instances right after checkout (in-memory store, no shared DB yet) - a
// 404 in the first second or two doesn't mean the order doesn't exist.
// Keep retrying on 404 specifically before showing "not found".
const NOT_FOUND_RETRY_LIMIT = 6;

const CONFIRM_EXPIRY_SECONDS = 300;

function buildConfirmUrl(requestId: string, merchant: string, amountSgd: number): string {
  const params = new URLSearchParams({
    merchant,
    amount: String(amountSgd),
    expiry: String(CONFIRM_EXPIRY_SECONDS),
    rid: requestId,
    return_to: `/store/order/${requestId}`,
  });
  return `/confirm?${params.toString()}`;
}

export function OrderStatus({ requestId }: { requestId: string }) {
  const [data, setData] = useState<OrderResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFoundAttempts, setNotFoundAttempts] = useState(0);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;

    async function poll() {
      try {
        const response = await fetch(`/api/store/orders/${requestId}`);
        if (response.status === 404) {
          attempt += 1;
          if (stopped) return;
          setNotFoundAttempts(attempt);
          if (attempt < NOT_FOUND_RETRY_LIMIT) {
            timer = setTimeout(poll, 1000);
          }
          return;
        }
        const body = (await response.json()) as OrderResponse & { error?: string };
        if (!response.ok) throw new Error(body.error ?? "order lookup failed");
        if (stopped) return;
        setData(body);
        if (body.status === "awaiting_signature") {
          timer = setTimeout(poll, POLL_MS);
        }
      } catch (caught) {
        if (!stopped) setError((caught as Error).message);
      }
    }

    poll();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [requestId]);

  if (error) {
    return <p className="text-sm text-[#b32a2a]">{error}</p>;
  }

  if (!data) {
    if (notFoundAttempts >= NOT_FOUND_RETRY_LIMIT) {
      return (
        <p className="text-sm text-[#b32a2a]">
          No order found for {requestId}. Check the link, or start again from{" "}
          <Link href="/store" className="underline">
            the store
          </Link>
          .
        </p>
      );
    }
    return <p className="text-sm text-[#432b21]/60">Loading order…</p>;
  }

  const product = data.order ? getStoreProduct(data.order.slug) : undefined;
  const confirmUrl = data.order
    ? buildConfirmUrl(requestId, data.order.merchant, data.order.amountSgd)
    : undefined;

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mt-6 mb-1">
        Order for {product?.name ?? data.order?.slug ?? requestId}
      </h1>
      {data.order ? (
        <p className="text-sm text-[#432b21]/60 mb-8">
          {formatSgd(data.order.amountSgd)} · {data.order.merchant} · {requestId}
        </p>
      ) : null}

      {data.status === "awaiting_signature" ? (
        <div>
          <p className="text-sm text-[#432b21]/70 mb-4">
            Waiting for the signed confirmation…
          </p>
          {confirmUrl ? (
            <a
              href={confirmUrl}
              className="inline-flex items-center rounded-full bg-[#432b21] text-white text-sm font-semibold px-5 py-2.5 hover:bg-[#5a3a2c] transition-colors"
            >
              Go sign at /confirm →
            </a>
          ) : null}
        </div>
      ) : null}

      {data.status === "settled" ? (
        <div className="rounded-xl border border-[#bcd6a8] bg-[#eef6e6] p-5">
          <p className="text-sm font-semibold text-[#3e6b2a] mb-2">✓ Order paid</p>
          <p className="text-sm text-[#432b21]/80 mb-3">
            {data.order?.amountSgd ? `SGD ${data.order.amountSgd.toFixed(2)}` : null} settled
            to {data.order?.merchant} on-chain.
          </p>
          {data.receipt?.snowtraceUrl ? (
            <a
              href={data.receipt.snowtraceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-[#c96a3e] hover:underline"
            >
              View settlement on Snowtrace ↗
            </a>
          ) : null}
        </div>
      ) : null}

      {data.status === "refused" ? (
        // The S2 payoff: AgentPay's own Binding refused the mint. A signed
        // Block Receipt exists — show the confirmed-vs-requested Tuple diff.
        <div className="rounded-xl border border-[#e3a3a3] bg-[#fdecec] p-5">
          <p className="text-sm font-semibold text-[#b32a2a] mb-2">
            ⛔ Blocked by AgentPay — signed Block Receipt
          </p>
          <p className="text-sm text-[#432b21]/80 mb-3">{data.receipt?.reason}</p>
          {data.receipt?.requested && data.receipt?.confirmed ? (
            <div className="text-xs font-mono text-[#432b21]/80 space-y-1">
              <p>
                requested: {data.receipt.requested.merchant} / SGD{" "}
                {(Number(data.receipt.requested.amountSgdCents) / 100).toFixed(2)}
              </p>
              <p>
                confirmed: {data.receipt.confirmed.merchant} / SGD{" "}
                {(Number(data.receipt.confirmed.amountSgdCents) / 100).toFixed(2)}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {data.status === "rail_failed" ? (
        // rail_failed — the S3 payoff. StraitsX declined settlement (e.g. the
        // sandbox wallet doesn't have enough XSGD for this order) — no Block
        // Receipt exists, because AgentPay never refused this Tuple. Distinct
        // styling and copy on purpose (SIG-018 block-attribution): AgentPay
        // blocks what the user never confirmed; StraitsX blocks what the
        // user never allowed.
        <div className="rounded-xl border border-[#e8c98a] bg-[#fdf3e0] p-5">
          <p className="text-sm font-semibold text-[#8a5a1a] mb-2">
            ⚠ Blocked by the payment rail (StraitsX) — not an AgentPay refusal
          </p>
          <p className="text-sm text-[#432b21]/80 mb-1">
            AgentPay confirmed this Tuple matched what you signed — the mint
            itself was declined at settlement.
          </p>
          <p className="text-xs font-mono text-[#432b21]/70 whitespace-pre-wrap mt-3">
            {data.detail}
          </p>
        </div>
      ) : null}
    </div>
  );
}
