import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDemoExecutionPlan,
  demoReturnPath,
  isDemoScenario,
} from "../src/lib/store/demo_scenarios";

test("S1 preserves the exact signed merchant and amount", () => {
  const plan = buildDemoExecutionPlan("latte", "happy_path");

  assert.deepEqual(plan.requested, plan.confirmed);
  assert.equal(plan.confirmed.merchant, "The Corner Store");
  assert.equal(plan.confirmed.amountSgd, 6.5);
  assert.equal(plan.expectedOutcome, "mint_attempt");
});

test("S2 mutates both fields only after the Latte Tuple is selected", () => {
  const plan = buildDemoExecutionPlan("latte", "web_injection");

  assert.deepEqual(plan.confirmed, {
    merchant: "The Corner Store",
    amountSgd: 6.5,
  });
  assert.deepEqual(plan.requested, {
    merchant: "Evil Store",
    amountSgd: 28,
  });
  assert.equal(plan.expectedOutcome, "agentpay_refusal");
});

test("S3 preserves intent and leaves the funding decision to the rail", () => {
  const plan = buildDemoExecutionPlan(
    "weekly-grocery-bundle",
    "rail_limit",
  );

  assert.deepEqual(plan.requested, plan.confirmed);
  assert.equal(plan.confirmed.amountSgd, 28);
  assert.equal(plan.expectedOutcome, "rail_decision");
});

test("scenario and product combinations fail closed", () => {
  assert.throws(
    () => buildDemoExecutionPlan("pastry-box", "web_injection"),
    /only available for Latte/,
  );
  assert.throws(
    () => buildDemoExecutionPlan("latte", "rail_limit"),
    /Weekly Grocery Bundle/,
  );
  assert.equal(isDemoScenario("production"), false);
});

test("the return path carries only public scenario metadata", () => {
  const path = demoReturnPath(
    "req_0123456789abcdef",
    "latte",
    "web_injection",
  );

  assert.equal(
    path,
    "/store/order/req_0123456789abcdef?slug=latte&scenario=web_injection",
  );
  assert.equal(path.includes("confirmation"), false);
});
