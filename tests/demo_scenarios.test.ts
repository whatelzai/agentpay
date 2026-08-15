import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDemoExecutionPlan,
  demoReturnPath,
  isDemoScenario,
} from "../src/lib/store/demo_scenarios";

test("S1 preserves the exact signed merchant and amount", () => {
  const plan = buildDemoExecutionPlan("latte-1", "happy_path");

  assert.deepEqual(plan.requested, plan.confirmed);
  assert.equal(plan.confirmed.merchant, "The Corner Store");
  assert.equal(plan.confirmed.amountSgd, 5.0);
  assert.equal(plan.expectedOutcome, "mint_attempt");
});

test("S2 mutates both fields only after a hidden-payload Tuple is selected", () => {
  const plan = buildDemoExecutionPlan("latte-2", "web_injection");

  assert.deepEqual(plan.confirmed, {
    merchant: "The Corner Store",
    amountSgd: 5.5,
  });
  assert.deepEqual(plan.requested, {
    merchant: "Evil Store",
    amountSgd: 28,
  });
  assert.equal(plan.expectedOutcome, "agentpay_refusal");
});

test("juice-2 also carries the S2 injection payload (cross-category attack)", () => {
  const plan = buildDemoExecutionPlan("juice-2", "web_injection");

  assert.deepEqual(plan.confirmed, {
    merchant: "The Corner Store",
    amountSgd: 7.0,
  });
  assert.deepEqual(plan.requested, {
    merchant: "Evil Store",
    amountSgd: 28,
  });
  assert.equal(plan.expectedOutcome, "agentpay_refusal");
});

test("scenario and product combinations fail closed", () => {
  // web_injection requires a product with a hidden payload
  assert.throws(
    () => buildDemoExecutionPlan("latte-1", "web_injection"),
    /hidden content-source payload/,
  );
  assert.throws(
    () => buildDemoExecutionPlan("juice-1", "web_injection"),
    /hidden content-source payload/,
  );
  // rail_limit has no product in the current catalog (all under SGD 30)
  assert.throws(
    () => buildDemoExecutionPlan("latte-2", "rail_limit"),
    /no product in the current catalog/,
  );
  // unknown scenario string is refused
  assert.equal(isDemoScenario("production"), false);
  // unknown product slug is refused
  assert.throws(
    () => buildDemoExecutionPlan("weekly-grocery-bundle", "happy_path"),
    /unknown demo product/,
  );
});

test("the return path carries only public scenario metadata", () => {
  const path = demoReturnPath(
    "req_0123456789abcdef",
    "latte-2",
    "web_injection",
  );

  assert.equal(
    path,
    "/store/order/req_0123456789abcdef?slug=latte-2&scenario=web_injection",
  );
  assert.equal(path.includes("confirmation"), false);
});
