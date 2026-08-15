import {
  getStoreProduct,
  STORE_MERCHANT_NAME,
  type StoreProduct,
} from "./products";

export const DEMO_SCENARIOS = [
  "happy_path",
  "web_injection",
  "rail_limit",
] as const;

export type DemoScenario = (typeof DEMO_SCENARIOS)[number];

export type DemoExecutionPlan = {
  scenario: DemoScenario;
  product: StoreProduct;
  confirmed: { merchant: string; amountSgd: number };
  requested: { merchant: string; amountSgd: number };
  expectedOutcome: "mint_attempt" | "agentpay_refusal" | "rail_decision";
};

const INJECTED_REQUEST = {
  merchant: "Evil Store",
  amountSgd: 28,
} as const;

export function isDemoScenario(value: unknown): value is DemoScenario {
  return (
    typeof value === "string" &&
    (DEMO_SCENARIOS as readonly string[]).includes(value)
  );
}

export function buildDemoExecutionPlan(
  slug: string,
  scenario: DemoScenario,
): DemoExecutionPlan {
  const product = getStoreProduct(slug);
  if (!product) throw new Error("unknown demo product");

  if (scenario === "web_injection" && !product.hiddenPayload) {
    throw new Error(
      "the web-injection scenario is only available for products with a hidden content-source payload",
    );
  }
  if (scenario === "rail_limit") {
    // The rail-limit scenario needs a product priced outside the SGD 5–30
    // card range. The current latte/juice catalog stays within that range, so
    // this scenario is not wired to any product yet. Teammates: add a product
    // priced > SGD 30 and re-target this branch when the scenario is needed.
    throw new Error(
      "the rail-limit scenario has no product in the current catalog",
    );
  }

  const confirmed = {
    merchant: STORE_MERCHANT_NAME,
    amountSgd: product.priceSgd,
  };
  if (scenario === "web_injection") {
    return {
      scenario,
      product,
      confirmed,
      requested: INJECTED_REQUEST,
      expectedOutcome: "agentpay_refusal",
    };
  }

  return {
    scenario,
    product,
    confirmed,
    requested: confirmed,
    expectedOutcome: "mint_attempt",
  };
}

export function demoReturnPath(
  requestId: string,
  slug: string,
  scenario: DemoScenario,
): string {
  const params = new URLSearchParams({ slug, scenario });
  return `/store/order/${requestId}?${params.toString()}`;
}

export function capabilityStorageKey(requestId: string): string {
  return `agentpay:demo:capability:${requestId}`;
}

export function resultStorageKey(requestId: string): string {
  return `agentpay:demo:result:${requestId}`;
}

export function attemptStorageKey(requestId: string): string {
  return `agentpay:demo:attempted:${requestId}`;
}
