import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolContext } from "./types";
import { decodeToken, verifyConfirmation } from "../../binding/verify";
import { claimNonce, releaseNonce } from "../../binding/nonces";
import { mintCard, straitsxEnv } from "../../straitsx/client";
import { recordBlockReceipt, recordMintReceipt } from "../../receipts";
import { storeCardSecret } from "../../card_vault";

// StraitsX card range (SIG-021). The raw API is looser; we stay inside it.
const MIN_AMOUNT_CENTS = 500n;
const MAX_AMOUNT_CENTS = 3000n;

function refusal(text: string): CallToolResult {
  return { content: [{ type: "text", text }], isError: true };
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
  const requested = {
    merchant,
    amountSgdCents: BigInt(Math.round(amountSgd * 100)),
  };

  let decoded;
  try {
    decoded = decodeToken(confirmationToken);
  } catch (e) {
    const receipt = await recordBlockReceipt({
      reason: `confirmation_token could not be decoded: ${(e as Error).message}`,
      requested,
    });
    return refusal(
      `⛔ EXECUTE REFUSED — confirmation_token could not be decoded: ${(e as Error).message}\nBlock Receipt ${receipt.id} logged.`,
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
    return refusal(
      `⛔ EXECUTE REFUSED — signature verification failed: ${verification.reason}\nBlock Receipt ${receipt.id} logged.`,
    );
  }

  // Owner check: only the registered owner's signature can move money.
  // Fail closed — a mint gate with no configured owner refuses everything.
  const owner = process.env.OWNER_ADDRESS;
  if (!owner) {
    const receipt = await recordBlockReceipt({
      reason: "OWNER_ADDRESS is not configured; the Mint Gate fails closed",
      requested,
      confirmed,
    });
    return refusal(
      `⛔ EXECUTE REFUSED — this deployment has no registered owner (OWNER_ADDRESS unset). The Mint Gate fails closed.\nBlock Receipt ${receipt.id} logged.`,
    );
  }
  if (verification.recoveredAddress.toLowerCase() !== owner.toLowerCase()) {
    const receipt = await recordBlockReceipt({
      reason: `signer ${verification.recoveredAddress} is not the registered owner`,
      requested,
      confirmed,
    });
    return refusal(
      [
        "⛔ EXECUTE REFUSED — the confirmation is validly signed, but not by the registered owner.",
        "",
        `  signer:  ${verification.recoveredAddress}`,
        `  owner:   ${owner}`,
        "",
        "Only the owner's wallet can authorize a mint. A stolen or third-party confirmation moves nothing.",
        `Block Receipt ${receipt.id} logged.`,
      ].join("\n"),
    );
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
    return refusal(
      [
        "⛔ EXECUTE REFUSED — agent request diverges from user signature:",
        "",
        ...diff,
        "",
        `Signer: ${verification.recoveredAddress}`,
        `Block Receipt ${receipt.id} — signed record of this refusal logged.`,
        "",
        "This is prompt-injection defence in action. The user cryptographically signed one purchase; the agent asked for a different one. AgentPay refuses to mint. Money does not move.",
      ].join("\n"),
    );
  }

  if (
    decoded.amountSgd < MIN_AMOUNT_CENTS ||
    decoded.amountSgd > MAX_AMOUNT_CENTS
  ) {
    const receipt = await recordBlockReceipt({
      reason: `amount SGD ${(Number(decoded.amountSgd) / 100).toFixed(2)} is outside the 5–30 SGD card range`,
      requested,
      confirmed,
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
    return refusal(
      `⛔ EXECUTE REFUSED — this confirmation token was already used. One signature authorizes exactly one mint.\nBlock Receipt ${receipt.id} logged.`,
    );
  }

  const env = straitsxEnv();
  const mint = await mintCard({
    amountCents: decoded.amountSgd,
    cardholderName: "AgentPay Demo",
    env,
  });

  if (!mint.ok) {
    console.error(`[agentpay] mint failed at the rail: ${mint.reason}`);
    if (!mint.paymentAttempted) {
      // Failed before any payment was signed or sent: retry is free.
      releaseNonce(decoded.nonce);
      return refusal(
        `Error: the mint failed at the rail — ${mint.reason}\nNo payment was sent. Your confirmation was NOT consumed; it is safe to retry until it expires.`,
      );
    }
    // Payment was sent; the facilitator settles on-chain BEFORE returning the
    // card, so the XSGD may be gone even though this response failed. Keep
    // the nonce consumed — an automatic retry could pay twice.
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
