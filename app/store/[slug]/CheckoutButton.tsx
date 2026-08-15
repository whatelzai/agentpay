"use client";

import { useState } from "react";
import { formatSgd } from "@/src/lib/store/products";
import type { DemoScenario } from "@/src/lib/store/demo_scenarios";

type CheckoutChallenge = {
  confirm_url?: string;
  error?: string;
};

export function CheckoutButton({
  slug,
  priceSgd,
  scenario,
  label,
  tone = "primary",
}: {
  slug: string;
  priceSgd: number;
  scenario: DemoScenario;
  label?: string;
  tone?: "primary" | "attack" | "rail";
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
        body: JSON.stringify({ slug, scenario }),
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
        className={`inline-flex items-center rounded-full border text-sm font-semibold px-5 py-3 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
          tone === "attack"
            ? "border-[#b32a2a] bg-[#b32a2a] text-white hover:bg-[#8f2020]"
            : tone === "rail"
              ? "border-[#c98a2e] bg-[#fdf3e0] text-[#6b4615] hover:bg-[#f8e5bf]"
              : "border-[#432b21] bg-[#432b21] text-white hover:bg-[#5a3a2c]"
        }`}
      >
        {busy
          ? "Preparing signed intent..."
          : label ?? `Buy for ${formatSgd(priceSgd)} ->`}
      </button>
      {error ? <p className="text-sm text-[#b32a2a] mt-3">{error}</p> : null}
    </div>
  );
}
