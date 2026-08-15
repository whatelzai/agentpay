import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolContext } from "./types";
import { decodeToken, verifyConfirmation } from "../../binding/verify";
import { claimNonce, releaseNonce } from "../../binding/nonces";
import { configuredPaymentRail } from "../../payments/adapter";
import {
  STRAITSX_CHAIN_ID,
  straitsxEnv,
  verifyPaymentProof,
} from "../../straitsx/client";
import { recordBlockReceipt, recordMintReceipt } from "../../receipts";
import { storeCardSecret } from "../../card_vault";
import {
  isSupportedCardAmount,
  sgdToCents,
} from "../../payments/amount";
import {
  isSealedConfirmationToken,
  openConfirmationToken,
} from "../../signing/confirmation_seal";
import { recordSpendAttempt, type SpendOutcome } from "../../telemetry";

function refusal(text: string): CallToolResult {
  return { content: [{ type: "text", text }], isError: true };
}

function newCorrelationId(): string {
  return `att_${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

async function record(
  correlationId: string,
  outcome: SpendOutcome,
  reasonCode: string,
  requested: { merchant: string; amountSgdCents: bigint | number },
  extras: {
    signerAddress?: string;
    rail?: string;
    railStatus?: string;
    evidenceUri?: string;
    confirmed?: { merchant: string; amountSgdCents: bigint | number };
  } = {},
): Promise<void> {
  const { confirmed, ...rest } = extras;
  await recordSpendAttempt({
    correlationId,
    outcome,
    decision: outcome === "authorized" ? "allowed" : "blocked",
    reasonCode,
    merchant: requested.merchant,
    amountSgdCents: Number(requested.amountSgdCents),
    signedMerchant: confirmed?.merchant,
    signedAmountSgdCents:
      confirmed?.amountSgdCents != null
        ? Number(confirmed.amountSgdCents)
        : undefined,
    ...rest,
  });
}

export async function executePurchase(
  _ctx: ToolContext,
  args: Record<string, unknown>,
): Promise<CallToolResult> {
  const confirmationToken =
    typeof args.confirmation_token === "string"
      ? args.confirmation_token
      : undefined;
  const merchant = typeof args.merchant === "string" ? args.merchant : undefined;
  const amountSgd =
    typeof args.amount_sgd === "number" ? args.amount_sgd : undefined;

  if (!confirmationToken || !merchant || amountSgd === undefined) {
    return refusal(
      "Error: confirmation_token (string), merchant (string), and amount_sgd (number) are all required.",
    );
  }
  const requestedAmountCents = sgdToCents(amountSgd);
  if (requestedAmountCents === null) {
    return refusal(
      "Error: amount_sgd must be positive and use whole cents; AgentPay never rounds an execution request.",
    );
  }
  const requested = {
    merchant,
    amountSgdCents: requestedAmountCents,
  };
  let correlationId = newCorrelationId();

  let serializedToken = confirmationToken;
  const isSealed = isSealedConfirmationToken(confirmationToken);
  if (isSealed) {
    try {
      serializedToken = openConfirmationToken(confirmationToken);
    } catch (error) {
      const receipt = await recordBlockReceipt({
        reason: `confirmation capability could not be opened: ${(error as Error).message}`,
        requested,
      });
      await record(correlationId, "refused_invalid_sig", "capability_open_failed", requested);
      return refusal(
        `EXECUTE REFUSED - confirmation capability could not be opened.
Block Receipt ${receipt.id} logged.`,
      );
    }
  }

  let decoded;
  try {
    decoded = decodeToken(serializedToken);
  } catch (e) {
    const receipt = await recordBlockReceipt({
      reason: `confirmation_token could not be decoded: ${(e as Error).message}`,
      requested,
    });
    await record(correlationId, "refused_invalid_sig", "token_decode_failed", requested);
    return refusal(
      `⛔ EXECUTE REFUSED — confirmation_token could not be decoded: ${(e as Error).message}\nBlock Receipt ${receipt.id} logged.`,
    );
  }
  if (decoded.version === 2) {
    correlationId = decoded.requestId;
  }
  if (decoded.version === 2 && !isSealed) {
    const confirmed = {
      merchant: decoded.merchant,
      amountSgdCents: decoded.amountSgd,
    };
    const receipt = await recordBlockReceipt({
      reason: "unsealed user-wallet confirmation exposed a payment signature",
      requested,
      confirmed,
    });
    await record(correlationId, "refused_invalid_sig", "unsealed_v2_token", requested);
    return refusal(
      `EXECUTE REFUSED - user-wallet confirmations must be AgentPay-sealed so the agent cannot access the payment signature.
Block Receipt ${receipt.id} logged.`,
    );
  }
  const confirmed = {
    merchant: decoded.merchant,
    amountSgdCents: decoded.amountSgd,
  };

  const verification = await verifyConfirmation(decoded);
  if (!verification.valid) {
    const receipt = await recordBlockReceipt({
      reason: `signature verification failed: ${verification.reason}`,
      requested,
      confirmed,
    });
    await record(correlationId, "refused_invalid_sig", "confirmation_sig_invalid", requested);
    return refusal(
      `⛔ EXECUTE REFUSED — signature verification failed: ${verification.reason}\nBlock Receipt ${receipt.id} logged.`,
    );
  }

  let rail;
  try {
    rail = configuredPaymentRail();
  } catch (error) {
    const receipt = await recordBlockReceipt({
      reason: `payment rail configuration failed: ${(error as Error).message}`,
      requested,
      confirmed,
    });
    await record(correlationId, "refused_other", "rail_config_failed", requested, {
      signerAddress: verification.recoveredAddress,
    });
    return refusal(
      `EXECUTE REFUSED - payment rail configuration failed closed.\nBlock Receipt ${receipt.id} logged.`,
    );
  }

  if (decoded.version === 1) {
    if (rail.fundingMode !== "platform_wallet") {
      const receipt = await recordBlockReceipt({
        reason: "legacy confirmation cannot use user_wallet funding",
        requested,
        confirmed,
      });
      await record(correlationId, "refused_other", "v1_wrong_funding_mode", requested, {
        signerAddress: verification.recoveredAddress,
      });
      return refusal(
        `EXECUTE REFUSED - this legacy confirmation has no user payment authorization.\nBlock Receipt ${receipt.id} logged.`,
      );
    }

    // Shared treasury mode is deliberately single-owner. Allowing any dynamic
    // signer here would let an attacker authorize spending from platform funds.
    const owner = process.env.DEMO_OWNER_ADDRESS ?? process.env.OWNER_ADDRESS;
    if (!owner) {
      const receipt = await recordBlockReceipt({
        reason: "DEMO_OWNER_ADDRESS is not configured; the Mint Gate fails closed",
        requested,
        confirmed,
      });
      await record(correlationId, "refused_other", "demo_owner_unconfigured", requested, {
        signerAddress: verification.recoveredAddress,
      });
      return refusal(
        `EXECUTE REFUSED - platform_wallet mode has no registered demo owner.\nBlock Receipt ${receipt.id} logged.`,
      );
    }
    if (verification.recoveredAddress.toLowerCase() !== owner.toLowerCase()) {
      const receipt = await recordBlockReceipt({
        reason: `signer ${verification.recoveredAddress} is not the registered demo owner`,
        requested,
        confirmed,
      });
      await record(correlationId, "refused_invalid_sig", "v1_signer_not_owner", requested, {
        signerAddress: verification.recoveredAddress,
      });
      return refusal(
        [
          "EXECUTE REFUSED - the confirmation is not from the platform wallet owner.",
          `  signer: ${verification.recoveredAddress}`,
          `  owner:  ${owner}`,
          `Block Receipt ${receipt.id} logged.`,
        ].join("\n"),
      );
    }
  } else {
    if (rail.fundingMode !== "user_wallet") {
      const receipt = await recordBlockReceipt({
        reason: "user-funded confirmation cannot use platform_wallet funding",
        requested,
        confirmed,
      });
      await record(correlationId, "refused_other", "v2_wrong_funding_mode", requested, {
        signerAddress: verification.recoveredAddress,
      });
      return refusal(
        `EXECUTE REFUSED - the signed funding model does not match this deployment.\nBlock Receipt ${receipt.id} logged.`,
      );
    }
    if (
      verification.recoveredAddress.toLowerCase() !==
      decoded.payer.toLowerCase()
    ) {
      const receipt = await recordBlockReceipt({
        reason: "confirmation signer is not the payment wallet",
        requested,
        confirmed,
      });
      await record(correlationId, "refused_invalid_sig", "signer_not_payer", requested, {
        signerAddress: verification.recoveredAddress,
      });
      return refusal(
        `EXECUTE REFUSED - the confirming wallet is not the wallet funding the payment.\nBlock Receipt ${receipt.id} logged.`,
      );
    }
    const environment = straitsxEnv();
    if (decoded.chainId !== STRAITSX_CHAIN_ID[environment]) {
      const receipt = await recordBlockReceipt({
        reason: "confirmation chain does not match the configured rail",
        requested,
        confirmed,
      });
      await record(correlationId, "refused_other", "chain_id_mismatch", requested, {
        signerAddress: verification.recoveredAddress,
      });
      return refusal(
        `EXECUTE REFUSED - confirmation chain does not match the configured rail.\nBlock Receipt ${receipt.id} logged.`,
      );
    }
    const paymentVerification = await verifyPaymentProof(decoded.paymentProof, {
      amountCents: decoded.amountSgd,
      environment,
      payerAddress: decoded.payer,
    });
    if (!("valid" in paymentVerification)) {
      const receipt = await recordBlockReceipt({
        reason: `payment authorization failed: ${paymentVerification.reason}`,
        requested,
        confirmed,
      });
      await record(correlationId, "refused_invalid_sig", "payment_proof_invalid", requested, {
        signerAddress: verification.recoveredAddress,
      });
      return refusal(
        `EXECUTE REFUSED - payment authorization failed: ${paymentVerification.reason}\nBlock Receipt ${receipt.id} logged.`,
      );
    }
    if (
      paymentVerification.authorizationHash.toLowerCase() !==
      decoded.paymentAuthorizationHash.toLowerCase()
    ) {
      const receipt = await recordBlockReceipt({
        reason: "payment authorization does not match the signed Confirmation",
        requested,
        confirmed,
      });
      await record(correlationId, "refused_invalid_sig", "payment_hash_swapped", requested, {
        signerAddress: verification.recoveredAddress,
      });
      return refusal(
        `EXECUTE REFUSED - the payment authorization was replaced after confirmation.\nBlock Receipt ${receipt.id} logged.`,
      );
    }
  }

  // THE critical check: does the agent's request match what the user signed?
  const merchantMatches =
    decoded.merchant.toLowerCase() === merchant.toLowerCase();
  const amountMatches = decoded.amountSgd === requested.amountSgdCents;
  if (!merchantMatches || !amountMatches) {
    const diff: string[] = [];
    if (!merchantMatches) {
      diff.push(
        `  merchant: agent asked "${merchant}", user confirmed "${decoded.merchant}"`,
      );
    }
    if (!amountMatches) {
      diff.push(
        `  amount:   agent asked SGD ${amountSgd.toFixed(2)}, user confirmed SGD ${(Number(decoded.amountSgd) / 100).toFixed(2)}`,
      );
    }
    const receipt = await recordBlockReceipt({
      reason: "agent request diverges from the signed Tuple",
      requested,
      confirmed,
    });
    const receiptProof = receipt.signature
      ? "cryptographically signed record of this refusal"
      : "logged in unsigned sandbox demo mode";
    await record(correlationId, "refused_mismatch", "tuple_diverged", requested, {
      signerAddress: verification.recoveredAddress,
      confirmed,
    });
    return refusal(
      [
        "⛔ EXECUTE REFUSED — agent request diverges from user signature:",
        "",
        ...diff,
        "",
        `Signer: ${verification.recoveredAddress}`,
        `Block Receipt ${receipt.id} — ${receiptProof}.`,
        "",
        "This is prompt-injection defence in action. The user cryptographically signed one purchase; the agent asked for a different one. AgentPay refuses to mint. Money does not move.",
      ].join("\n"),
    );
  }

  if (!isSupportedCardAmount(decoded.amountSgd)) {
    const receipt = await recordBlockReceipt({
      reason: `amount SGD ${(Number(decoded.amountSgd) / 100).toFixed(2)} is outside the 5–30 SGD card range`,
      requested,
      confirmed,
    });
    await record(correlationId, "refused_other", "amount_out_of_card_range", requested, {
      signerAddress: verification.recoveredAddress,
    });
    return refusal(
      `⛔ EXECUTE REFUSED — amount SGD ${(Number(decoded.amountSgd) / 100).toFixed(2)} is outside the rail's 5–30 SGD card range.\nBlock Receipt ${receipt.id} logged.`,
    );
  }

  // One signature, one mint: claim the nonce before money moves.
  if (!claimNonce(decoded.nonce)) {
    const receipt = await recordBlockReceipt({
      reason: "replayed confirmation token — nonce already used",
      requested,
      confirmed,
    });
    await record(correlationId, "refused_replay", "nonce_already_used", requested, {
      signerAddress: verification.recoveredAddress,
    });
    return refusal(
      `⛔ EXECUTE REFUSED — this confirmation token was already used. One signature authorizes exactly one mint.\nBlock Receipt ${receipt.id} logged.`,
    );
  }

  const mint = await rail.execute({
    amountCents: decoded.amountSgd,
    cardholderName: "AgentPay Demo",
    payerAddress: decoded.version === 2 ? decoded.payer : undefined,
    proof: decoded.version === 2 ? decoded.paymentProof : undefined,
  });

  if (!mint.ok) {
    console.error(`[agentpay] mint failed at the rail: ${mint.reason}`);
    if (!mint.paymentAttempted) {
      // Failed before any payment was signed or sent: retry is free.
      releaseNonce(decoded.nonce);
      await record(correlationId, "refused_other", "rail_failed_pre_payment", requested, {
        signerAddress: verification.recoveredAddress,
        rail: rail.id,
        railStatus: mint.reason,
      });
      return refusal(
        `Error: the mint failed at the rail — ${mint.reason}\nNo payment was sent. Your confirmation was NOT consumed; it is safe to retry until it expires.`,
      );
    }
    // Payment was sent; the facilitator settles on-chain BEFORE returning the
    // card, so the XSGD may be gone even though this response failed. Keep
    // the nonce consumed — an automatic retry could pay twice.
    await record(correlationId, "unauthorized", "rail_failed_post_payment", requested, {
      signerAddress: verification.recoveredAddress,
      rail: rail.id,
      railStatus: mint.reason,
    });
    return refusal(
      [
        `Error: the rail failed AFTER payment was sent — ${mint.reason}`,
        "",
        "The payment may have settled on-chain even though no card was returned.",
        "Do NOT retry with this confirmation — it is consumed to prevent a double spend.",
        "A human must verify the wallet's on-chain balance and contact StraitsX with the settlement transaction before any new attempt.",
      ].join("\n"),
    );
  }

  const receipt = recordMintReceipt({
    tuple: {
      merchant: decoded.merchant,
      amountSgdCents: decoded.amountSgd.toString(),
      expiryTimestamp: decoded.expiryTimestamp.toString(),
      nonce: decoded.nonce,
    },
    signer: verification.recoveredAddress,
    amountSgd: mint.amountSgd,
    settlementTx: mint.settlementTx,
    snowtraceUrl: mint.snowtraceUrl,
  });
  // Credentials go to the server-side vault only — never into the receipt,
  // never into this tool result (SIG-020: card_opaque_id is the card's only
  // protection; the agent must not hold it).
  storeCardSecret({
    cardOpaqueId: mint.cardOpaqueId,
    settlementTx: mint.settlementTx,
    iframeUrl: mint.iframeUrl,
  });

  await record(correlationId, "authorized", "mint_ok", requested, {
    signerAddress: verification.recoveredAddress,
    rail: rail.id,
    railStatus: "settled",
    evidenceUri: mint.snowtraceUrl,
  });

  return {
    content: [
      {
        type: "text",
        text: [
          "✓ PURCHASE EXECUTED — scoped card minted on the StraitsX rail.",
          "",
          JSON.stringify(
            {
              authorized: true,
              request_id:
                decoded.version === 2 ? decoded.requestId : undefined,
              payment_rail: rail.id,
              funding_mode: rail.fundingMode,
              payer: decoded.version === 2 ? decoded.payer : undefined,
              amount_sgd: mint.amountSgd,
              settlement_tx: mint.settlementTx,
              snowtrace_url: mint.snowtraceUrl,
            },
            null,
            2,
          ),
          "",
          `receipt: ${receipt.id}`,
          "",
          "Card credentials are withheld by design: the human views the card via the AgentPay view-card flow. The settlement transaction above is the public, on-chain proof that exactly the confirmed amount moved.",
        ].join("\n"),
      },
    ],
  };
}
