import type {
  StraitsXPaymentIntent,
  StraitsXPaymentProof,
} from "./eip3009";
import {
  mintCard,
  mintCardWithPaymentProof,
  prepareCardMint,
  straitsxEnv,
  type MintResult,
  type PrepareMintResult,
} from "../straitsx/client";

export type FundingMode = "user_wallet" | "platform_wallet";
export type PaymentRailId = "straitsx";
export type PaymentIntent = StraitsXPaymentIntent;
export type PaymentProof = StraitsXPaymentProof;

export type PaymentRequest = {
  amountCents: bigint;
  cardholderName: string;
  payerAddress?: `0x${string}`;
  proof?: PaymentProof;
};

export interface PaymentRailAdapter {
  readonly id: PaymentRailId;
  readonly fundingMode: FundingMode;
  prepareUserPayment(input: {
    amountCents: bigint;
    cardholderName: string;
    payerAddress: `0x${string}`;
  }): Promise<PrepareMintResult>;
  execute(input: PaymentRequest): Promise<MintResult>;
}

export function configuredFundingMode(): FundingMode {
  return process.env.AGENTPAY_FUNDING_MODE === "platform_wallet"
    ? "platform_wallet"
    : "user_wallet";
}

export function configuredPaymentRailId(): PaymentRailId {
  const configured = process.env.AGENTPAY_PAYMENT_RAIL ?? "straitsx";
  if (configured !== "straitsx") {
    throw new Error(
      `unsupported AGENTPAY_PAYMENT_RAIL "${configured}"; this build supports straitsx`,
    );
  }
  return configured;
}

export function configuredPaymentRail(): PaymentRailAdapter {
  const id = configuredPaymentRailId();
  const fundingMode = configuredFundingMode();

  return {
    id,
    fundingMode,
    prepareUserPayment: (input) =>
      prepareCardMint({ ...input, environment: straitsxEnv() }),
    execute: (input) => {
      if (fundingMode === "platform_wallet") {
        return mintCard({
          amountCents: input.amountCents,
          cardholderName: input.cardholderName,
          env: straitsxEnv(),
        });
      }
      if (!input.payerAddress || !input.proof) {
        return Promise.resolve({
          ok: false,
          reason:
            "user_wallet funding requires a payer address and signed payment proof",
          paymentAttempted: false,
        });
      }
      return mintCardWithPaymentProof({
        amountCents: input.amountCents,
        cardholderName: input.cardholderName,
        environment: straitsxEnv(),
        payerAddress: input.payerAddress,
        proof: input.proof,
      });
    },
  };
}
