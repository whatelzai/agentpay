"use client";

import { useState } from "react";
import { createWalletClient, custom, type WalletClient } from "viem";
import { avalanche } from "viem/chains";
import {
  AGENTPAY_DOMAIN,
  CONFIRMATION_TYPES,
} from "@/src/lib/binding/schema";
import { encodeToken } from "@/src/lib/binding/verify";

type EthereumProvider = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export function ConfirmClient({
  merchant,
  amount,
  expirySeconds,
  requestId,
}: {
  merchant: string;
  amount: string;
  expirySeconds: string;
  requestId?: string;
}) {
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<"sent" | "failed" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function connect() {
    setError(null);
    if (!window.ethereum) {
      setError(
        "No browser wallet detected. Install MetaMask, Rabby, Core, or another EVM wallet.",
      );
      return;
    }
    setBusy(true);
    try {
      const client: WalletClient = createWalletClient({
        chain: avalanche,
        transport: custom(window.ethereum),
      });
      const [addr] = await client.requestAddresses();
      setAddress(addr);
    } catch (e) {
      setError(`Connect failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function sign() {
    if (!address || !window.ethereum) return;
    setError(null);
    setBusy(true);
    try {
      const parsedAmount = parseFloat(amount);
      const parsedExpiry = parseInt(expirySeconds, 10);
      if (Number.isNaN(parsedAmount) || Number.isNaN(parsedExpiry)) {
        throw new Error("amount and expiry must be numeric URL params");
      }
      const amountSgd = BigInt(Math.round(parsedAmount * 100));
      const expiryTimestamp = BigInt(
        Math.floor(Date.now() / 1000) + parsedExpiry,
      );
      const nonceBytes = crypto.getRandomValues(new Uint8Array(32));
      const nonce = ("0x" +
        Array.from(nonceBytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")) as `0x${string}`;

      const client: WalletClient = createWalletClient({
        chain: avalanche,
        transport: custom(window.ethereum),
        account: address,
      });

      const signature = await client.signTypedData({
        account: address,
        domain: AGENTPAY_DOMAIN,
        types: CONFIRMATION_TYPES,
        primaryType: "Confirmation",
        message: { merchant, amountSgd, expiryTimestamp, nonce },
      });

      const encoded = encodeToken({
        merchant,
        amountSgd,
        expiryTimestamp,
        nonce,
        signature,
        signer: address,
      });
      setToken(encoded);

      // Hand the token to the agent automatically (fallback: manual copy).
      if (requestId) {
        try {
          const r = await fetch(`/api/confirmations/${requestId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: encoded }),
          });
          setDelivery(r.ok ? "sent" : "failed");
        } catch {
          setDelivery("failed");
        }
      }
    } catch (e) {
      setError(`Sign failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function copyToken() {
    if (!token) return;
    await navigator.clipboard.writeText(token);
  }

  return (
    <div className="space-y-4">
      {!address && (
        <button
          onClick={connect}
          disabled={busy}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-6 py-3 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? "Connecting…" : "Connect wallet"}
        </button>
      )}

      {address && !token && (
        <>
          <p className="text-sm text-neutral-500">
            Connected:{" "}
            <code className="text-emerald-400 text-xs">
              {address.slice(0, 6)}…{address.slice(-4)}
            </code>
          </p>
          <button
            onClick={sign}
            disabled={busy}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-6 py-3 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? "Waiting for signature…" : "Sign to authorize"}
          </button>
        </>
      )}

      {token && (
        <div className="space-y-3">
          {delivery === "sent" ? (
            <p className="text-sm text-emerald-400">
              ✓ Signed and delivered to your agent. It will collect the
              confirmation in a few seconds — you can close this page.
            </p>
          ) : delivery === "failed" ? (
            <p className="text-sm text-amber-400">
              ✓ Signed, but automatic delivery failed. Copy the token below and
              paste it back into your agent&apos;s chat.
            </p>
          ) : (
            <p className="text-sm text-emerald-400">
              ✓ Signed. Copy the token below and paste it back into your
              agent&apos;s chat.
            </p>
          )}
          <div className="border border-neutral-800 rounded p-3 bg-neutral-900">
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">
              Confirmation token
            </p>
            <p className="text-xs text-neutral-300 font-mono break-all">
              {token}
            </p>
          </div>
          <button
            onClick={copyToken}
            className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-medium px-6 py-2 rounded transition-colors text-sm"
          >
            Copy token to clipboard
          </button>
          <p className="text-xs text-neutral-500 mt-4">
            Ask your agent: <em className="text-neutral-300">&ldquo;Call the AgentPay execute_purchase tool with confirmation_token=&lt;paste&gt;, merchant=&ldquo;{merchant}&rdquo;, amount_sgd={amount}.&rdquo;</em>
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400 mt-2">{error}</p>
      )}
    </div>
  );
}
