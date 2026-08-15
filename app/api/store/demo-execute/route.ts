import { NextResponse } from "next/server";
import { decodeToken } from "@/src/lib/binding/verify";
import { isRequestId } from "@/src/lib/confirmations";
import { executePurchase } from "@/src/lib/mcp/tools/execute_purchase";
import { getReceipt } from "@/src/lib/receipts";
import {
  isSealedConfirmationToken,
  openConfirmationToken,
} from "@/src/lib/signing/confirmation_seal";
import { straitsxEnv } from "@/src/lib/straitsx/client";
import { classifyExecutionResult } from "@/src/lib/store/classify_execution";
import {
  buildDemoExecutionPlan,
  isDemoScenario,
} from "@/src/lib/store/demo_scenarios";

export const dynamic = "force-dynamic";

function noStoreJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  if (
    process.env.AGENTPAY_DEMO_MODE !== "true" ||
    straitsxEnv() !== "sandbox"
  ) {
    return noStoreJson(
      { error: "the browser demo executor is available only in sandbox demo mode" },
      503,
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return noStoreJson({ error: "body must be JSON" }, 400);
  }

  const requestId =
    typeof body.request_id === "string" ? body.request_id : undefined;
  const slug = typeof body.slug === "string" ? body.slug : undefined;
  const token =
    typeof body.confirmation_token === "string"
      ? body.confirmation_token
      : undefined;

  if (
    !requestId ||
    !isRequestId(requestId) ||
    !slug ||
    !isDemoScenario(body.scenario) ||
    !token ||
    token.length > 24_000 ||
    !isSealedConfirmationToken(token)
  ) {
    return noStoreJson(
      {
        error:
          "request_id, slug, scenario, and a sealed confirmation_token are required",
      },
      400,
    );
  }

  try {
    const decoded = decodeToken(openConfirmationToken(token));
    if (decoded.version !== 2 || decoded.requestId !== requestId) {
      return noStoreJson(
        { error: "the sealed capability belongs to a different demo request" },
        400,
      );
    }
  } catch {
    return noStoreJson({ error: "the sealed capability is invalid" }, 400);
  }

  let plan;
  try {
    plan = buildDemoExecutionPlan(slug, body.scenario);
  } catch (error) {
    return noStoreJson({ error: (error as Error).message }, 400);
  }

  const result = await executePurchase(
    { mode: "http", baseUrl: new URL(request.url).origin },
    {
      confirmation_token: token,
      merchant: plan.requested.merchant,
      amount_sgd: plan.requested.amountSgd,
    },
  );
  const text = result.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("\n");
  const outcome = classifyExecutionResult(result.isError, text);

  if (outcome.kind === "rail_failed") {
    return noStoreJson({
      status: "rail_failed",
      request_id: requestId,
      scenario: plan.scenario,
      product: plan.product,
      confirmed: plan.confirmed,
      requested: plan.requested,
      expected_outcome: plan.expectedOutcome,
      detail: outcome.detail,
    });
  }

  return noStoreJson({
    status: outcome.kind === "settled" ? "settled" : "refused",
    request_id: requestId,
    scenario: plan.scenario,
    product: plan.product,
    confirmed: plan.confirmed,
    requested: plan.requested,
    expected_outcome: plan.expectedOutcome,
    receipt: getReceipt(outcome.receiptId),
  });
}
