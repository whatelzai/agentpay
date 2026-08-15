import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getStoreProduct, STORE_MERCHANT_NAME } from "@/src/lib/store/products";
import { createOrder } from "@/src/lib/store/orders";
import { sgdToCents, isSupportedCardAmount } from "@/src/lib/payments/amount";
import { confirmationSealingConfigured } from "@/src/lib/signing/confirmation_seal";
import { configuredPaymentRail } from "@/src/lib/payments/adapter";
import { STRAITSX_CHAIN_ID, XSGD_ASSET, straitsxEnv } from "@/src/lib/straitsx/client";

// The store's own x402 merchant endpoint (SIG-021: "our side of the counter" -
// same 402 -> sign -> settle pattern as StraitsX's own card mint). What
// satisfies this 402 is the existing propose_purchase -> /confirm ->
// execute_purchase pipeline; StraitsX stays the facilitator, so `payTo` is
// resolved by the rail at settlement time, not by the store.
const CONFIRM_EXPIRY_SECONDS = 300;

export async function POST(request: Request) {
  let body: { slug?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const slug = typeof body.slug === "string" ? body.slug : undefined;
  const product = slug ? getStoreProduct(slug) : undefined;
  if (!product) {
    return NextResponse.json({ error: "unknown product" }, { status: 404 });
  }

  if (!confirmationSealingConfigured()) {
    return NextResponse.json(
      { error: "AgentPay confirmation sealing is not configured" },
      { status: 503 },
    );
  }
  let rail;
  try {
    rail = configuredPaymentRail();
  } catch (error) {
    return NextResponse.json(
      { error: `payment rail configuration failed: ${(error as Error).message}` },
      { status: 503 },
    );
  }

  const amountCents = sgdToCents(product.priceSgd);
  if (amountCents === null || !isSupportedCardAmount(amountCents)) {
    return NextResponse.json(
      { error: "product price is outside the 5-30 SGD card range" },
      { status: 500 },
    );
  }

  const requestId = `req_${randomBytes(8).toString("hex")}`;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://agentpay-tan.vercel.app";
  const confirmParams = new URLSearchParams({
    merchant: STORE_MERCHANT_NAME,
    amount: String(product.priceSgd),
    expiry: String(CONFIRM_EXPIRY_SECONDS),
    rid: requestId,
    return_to: `/store/order/${requestId}`,
  });
  const confirmUrl = `${baseUrl}/confirm?${confirmParams.toString()}`;

  createOrder({
    requestId,
    slug: product.slug,
    merchant: STORE_MERCHANT_NAME,
    amountSgd: product.priceSgd,
  });

  const env = straitsxEnv();
  return NextResponse.json(
    {
      x402Version: 1,
      accepts: [
        {
          scheme: "exact",
          chainId: STRAITSX_CHAIN_ID[env],
          asset: XSGD_ASSET[env],
          amount: amountCents.toString(),
          // Resolved by the StraitsX facilitator when execute_purchase settles -
          // the store never holds a receiving wallet (SIG-021 anchor).
          payTo: null,
          maxTimeoutSeconds: CONFIRM_EXPIRY_SECONDS,
          extra: { name: STORE_MERCHANT_NAME, version: "1", fundingMode: rail.fundingMode },
        },
      ],
      request_id: requestId,
      confirm_url: confirmUrl,
    },
    { status: 402 },
  );
}
