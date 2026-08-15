import { isAddress } from "viem";
import { isRequestId } from "@/src/lib/confirmations";
import { configuredPaymentRail } from "@/src/lib/payments/adapter";
import {
  isSupportedCardAmount,
  sgdToCents,
} from "@/src/lib/payments/amount";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "body must be JSON" }, { status: 400 });
  }

  const requestId =
    typeof body.request_id === "string" ? body.request_id : undefined;
  const amountSgd =
    typeof body.amount_sgd === "number" ? body.amount_sgd : undefined;
  const payerAddress =
    typeof body.payer_address === "string" ? body.payer_address : undefined;

  if (
    !requestId ||
    !isRequestId(requestId) ||
    amountSgd === undefined ||
    !payerAddress ||
    !isAddress(payerAddress)
  ) {
    return Response.json(
      {
        error:
          "request_id, amount_sgd, and a valid payer_address are required",
      },
      { status: 400 },
    );
  }

  const amountCents = sgdToCents(amountSgd);
  if (amountCents === null) {
    return Response.json(
      { error: "amount_sgd must be positive and use whole cents" },
      { status: 400 },
    );
  }
  if (!isSupportedCardAmount(amountCents)) {
    return Response.json(
      { error: "amount_sgd must be within the 5-50 SGD card range" },
      { status: 400 },
    );
  }

  let rail;
  try {
    rail = configuredPaymentRail();
  } catch (error) {
    return Response.json(
      { error: (error as Error).message },
      { status: 503 },
    );
  }
  if (rail.fundingMode !== "user_wallet") {
    return Response.json(
      { error: "this deployment uses platform_wallet funding" },
      { status: 409 },
    );
  }

  const prepared = await rail.prepareUserPayment({
    amountCents,
    cardholderName: "AgentPay User",
    payerAddress,
  });
  if (!prepared.ok) {
    return Response.json({ error: prepared.reason }, { status: 502 });
  }

  return Response.json({
    request_id: requestId,
    rail: rail.id,
    intent: prepared.intent,
    authorization_hash: prepared.authorizationHash,
  });
}
