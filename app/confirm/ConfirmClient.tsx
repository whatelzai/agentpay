"use client";

import { useEffect, useState } from "react";
import { createWalletClient, custom, type WalletClient } from "viem";
import { avalanche, avalancheFuji } from "viem/chains";
import {
  agentPayDomain,
  CONFIRMATION_TYPES,
  LEGACY_AGENTPAY_DOMAIN,
  LEGACY_CONFIRMATION_TYPES,
} from "@/src/lib/binding/schema";
import { encodeToken } from "@/src/lib/binding/verify";
import {
  paymentAuthorizationHash,
  transferAuthorizationTypedData,
  type StraitsXPaymentIntent,
} from "@/src/lib/payments/eip3009";
import type { FundingMode } from "@/src/lib/payments/adapter";
import { sgdToCents } from "@/src/lib/payments/amount";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

type PreparedPaymentResponse = {
  intent?: StraitsXPaymentIntent;
  authorization_hash?: `0x${string}`;
  error?: string;
};

type StoredConfirmationResponse = {
  confirmation_token?: string;
  error?: string;
};

function randomNonce(): `0x${string}` {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `0x${Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

export function ConfirmClient({
  merchant,
  amount,
  expirySeconds,
  requestId,
  fundingMode,
  chainId,
}: {
  merchant: string;
  amount: string;
  expirySeconds: string;
  requestId?: string;
  fundingMode: FundingMode;
  chainId: 43113 | 43114;
}) {
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const chain = chainId === 43114 ? avalanche : avalancheFuji;

  useEffect(() => {
    if (!requestId) return;
    void fetch(`/api/confirmations/${requestId}/opened`, {
      method: "POST",
      keepalive: true,
    }).catch(() => {
      /* fire-and-forget telemetry */
    });
  }, [requestId]);

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
      const chainHex = `0x${chainId.toString(16)}`;
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: chainHex }],
        });
      } catch (caught) {
        if ((caught as { code?: number }).code !== 4902) throw caught;
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: chainHex,
              chainName: chain.name,
              nativeCurrency: chain.nativeCurrency,
              rpcUrls: chain.rpcUrls.default.http,
              blockExplorerUrls: [chain.blockExplorers.default.url],
            },
          ],
        });
      }
      const client: WalletClient = createWalletClient({
        chain,
        transport: custom(window.ethereum),
      });
      const [walletAddress] = await client.requestAddresses();
      setAddress(walletAddress);
    } catch (caught) {
      setError(`Connect failed: ${(caught as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function prepareUserPayment(
    payerAddress: `0x${string}`,
    amountSgd: number,
  ): Promise<PreparedPaymentResponse> {
    if (!requestId) {
      throw new Error("this confirmation URL has no request id");
    }
    const response = await fetch("/api/payments/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        request_id: requestId,
        amount_sgd: amountSgd,
        payer_address: payerAddress,
      }),
    });
    const body = (await response.json()) as PreparedPaymentResponse;
    if (!response.ok || !body.intent || !body.authorization_hash) {
      throw new Error(body.error ?? "payment preparation failed");
    }
    return body;
  }

  async function sign() {
    if (!address || !window.ethereum) return;
    setError(null);
    setBusy(true);
    try {
      const parsedAmount = Number(amount);
      const parsedExpiry = Number.parseInt(expirySeconds, 10);
      const amountSgd = sgdToCents(parsedAmount);
      if (
        amountSgd === null ||
        !Number.isInteger(parsedExpiry) ||
        parsedExpiry < 30 ||
        parsedExpiry > 300
      ) {
        throw new Error("amount and expiry must be numeric URL params");
      }
      const now = Math.floor(Date.now() / 1000);
      const client: WalletClient = createWalletClient({
        chain,
        transport: custom(window.ethereum),
        account: address,
      });

      // Re-check at signing time because the user may switch networks after
      // connecting. Both signatures pin the target Avalanche chain.
      const activeChainId = await client.getChainId();
      if (activeChainId !== chain.id) {
        try {
          await client.switchChain({ id: chain.id });
        } catch {
          await client.addChain({ chain });
          await client.switchChain({ id: chain.id });
        }
      }

      let encoded: string;
      if (fundingMode === "user_wallet") {
        const prepared = await prepareUserPayment(address, parsedAmount);
        const intent = prepared.intent!;
        const computedHash = paymentAuthorizationHash(intent);
        if (computedHash !== prepared.authorization_hash) {
          throw new Error("payment intent hash does not match the server response");
        }
        if (intent.accepted.chainId !== chainId) {
          throw new Error("payment intent targets a different chain");
        }

        const paymentSignature = await client.signTypedData({
          account: address,
          ...transferAuthorizationTypedData(intent),
        });
        const expiryTimestamp = BigInt(
          Math.min(now + parsedExpiry, Number(intent.authorization.validBefore)),
        );
        const nonce = randomNonce();
        const message = {
          requestId: requestId!,
          merchant,
          amountSgd,
          expiryTimestamp,
          nonce,
          paymentRail: "straitsx",
          payer: address,
          paymentAuthorizationHash: computedHash,
        } as const;
        const signature = await client.signTypedData({
          account: address,
          domain: agentPayDomain(chainId),
          types: CONFIRMATION_TYPES,
          primaryType: "Confirmation",
          message,
        });
        encoded = encodeToken({
          version: 2,
          chainId,
          ...message,
          signature,
          signer: address,
          paymentProof: { intent, signature: paymentSignature },
        });
      } else {
        const expiryTimestamp = BigInt(now + parsedExpiry);
        const nonce = randomNonce();
        const message = { merchant, amountSgd, expiryTimestamp, nonce };
        const signature = await client.signTypedData({
          account: address,
          domain: LEGACY_AGENTPAY_DOMAIN,
          types: LEGACY_CONFIRMATION_TYPES,
          primaryType: "Confirmation",
          message,
        });
        encoded = encodeToken({
          version: 1,
          ...message,
          signature,
          signer: address,
        });
      }

      if (!requestId) {
        throw new Error("this confirmation URL has no request id");
      }
      const response = await fetch(`/api/confirmations/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: encoded }),
      });
      const stored = (await response.json()) as StoredConfirmationResponse;
      if (!response.ok || !stored.confirmation_token) {
        throw new Error(stored.error ?? "AgentPay could not seal the confirmation");
      }
      setToken(stored.confirmation_token);
    } catch (caught) {
      setError(`Sign failed: ${(caught as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function copyToken() {
    if (token) await navigator.clipboard.writeText(token);
  }

  return (
    <div className="space-y-4">
      {fundingMode === "user_wallet" && !token && (
        <p className="rounded border border-emerald-900 bg-emerald-950/30 p-3 text-xs leading-relaxed text-emerald-200">
          Your wallet funds this purchase. You will approve two signatures: one
          exact XSGD payment authorization and one AgentPay confirmation that
          binds that authorization to this purchase. No private key reaches
          AgentPay.
        </p>
      )}

      {!address && (
        <button
          onClick={connect}
          disabled={busy}
          className="w-full rounded bg-emerald-500 px-6 py-3 font-semibold text-black transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Connecting..." : "Connect wallet"}
        </button>
      )}

      {address && !token && (
        <>
          <p className="text-sm text-neutral-500">
            Connected:{" "}
            <code className="text-xs text-emerald-400">
              {address.slice(0, 6)}...{address.slice(-4)}
            </code>
          </p>
          <button
            onClick={sign}
            disabled={busy}
            className="w-full rounded bg-emerald-500 px-6 py-3 font-semibold text-black transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Waiting for signatures..." : "Authorize exact purchase"}
          </button>
        </>
      )}

      {token && (
        <div className="space-y-3">
          <p className="text-sm text-emerald-400">
            Signed, sealed, and delivered to your agent. The capability below
            contains no readable payment signature. You can close this page.
          </p>
          <div className="rounded border border-neutral-800 bg-neutral-900 p-3">
            <p className="mb-2 text-xs uppercase tracking-wider text-neutral-500">
              Sealed confirmation capability
            </p>
            <p className="break-all font-mono text-xs text-neutral-300">
              {token}
            </p>
          </div>
          <button
            onClick={copyToken}
            className="w-full rounded bg-neutral-800 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
          >
            Copy token to clipboard
          </button>
          <p className="mt-4 text-xs text-neutral-500">
            Ask your agent to call <code>execute_purchase</code> with this token,
            merchant &quot;{merchant}&quot;, and amount SGD {amount}.
          </p>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
