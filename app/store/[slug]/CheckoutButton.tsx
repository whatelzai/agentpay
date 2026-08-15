"use client";

import { useState } from "react";
import { formatSgd } from "@/src/lib/store/products";

type CheckoutChallenge = {
  confirm_url?: string;
  error?: string;
};

export function CheckoutButton({
  slug,
  priceSgd,
}: {
  slug: string;
  priceSgd: number;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    setError(null);
    setBusy(true);
    try {
      const response = await fetch("/api/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const body = (await response.json()) as CheckoutChallenge;
      // 402 is the expected success response here - the store issuing its
      // own x402 challenge is the point, not an HTTP failure.
      if (response.status !== 402 || !body.confirm_url) {
        throw new Error(body.error ?? "checkout failed to start");
      }
      window.location.href = body.confirm_url;
    } catch (caught) {
      setError((caught as Error).message);
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={checkout}
        disabled={busy}
        className="inline-flex items-center rounded-full bg-[#432b21] text-white text-base font-semibold px-6 py-3.5 hover:bg-[#5a3a2c] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {busy ? "Starting checkout…" : `Buy for ${formatSgd(priceSgd)} →`}
      </button>
      {error ? <p className="text-sm text-[#b32a2a] mt-3">{error}</p> : null}
    </div>
  );
}
