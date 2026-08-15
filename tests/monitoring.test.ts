import assert from "node:assert/strict";
import test from "node:test";
import { classifyBlockReason } from "../app/_components/BlocksTable";
import { buildKpiRects } from "../app/_components/KpiRects";
import { getMonitorEnvironment } from "../src/lib/monitor";
import {
  getMonitorMetric,
  MONITOR_METRICS,
} from "../src/lib/monitor-metrics";
import {
  normalizeKpiSnapshot,
  type KpiSnapshot,
} from "../src/lib/supabase/server";

const measuredSnapshot: KpiSnapshot = {
  unauthorized_spends: 0,
  attacks_blocked: 5,
  authorized_count: 3,
  completed_count: 8,
  observed_attempts: 8,
  intent_fidelity_pct: 100,
  median_sign_time_ms: 7_000,
  window_days: 30,
  as_of: "2026-08-15T00:00:00.000Z",
};

test("unavailable KPI telemetry never renders a green zero", () => {
  const cards = buildKpiRects(null);

  assert.equal(cards[0].value, "—");
  assert.ok(cards.every((card) => card.status === "not measured"));
  assert.ok(cards.every((card) => card.tone === "unavailable"));
});

test("KPI normalization does not double-count refusals or invent fidelity", () => {
  const snapshot = normalizeKpiSnapshot(
    {
      unauthorized_spends: 0,
      attacks_blocked: 5,
      authorized_count: 0,
      completed_count: 5,
      median_sign_time_ms: 12_078,
    },
    30,
    "2026-08-15T00:00:00.000Z",
  );

  assert.equal(snapshot?.observed_attempts, 5);
  assert.equal(snapshot?.intent_fidelity_pct, null);
});

test("measured KPI telemetry exposes safety, utility, and sample-aware states", () => {
  const cards = buildKpiRects(measuredSnapshot);

  assert.deepEqual(
    cards.map(({ label, value, status }) => ({ label, value, status })),
    [
      { label: "Safety incidents", value: "0", status: "on target" },
      { label: "Safety refusals", value: "5", status: "observed" },
      { label: "Intent fidelity", value: "100%", status: "on target" },
      { label: "Median sign", value: "7.0s", status: "on target" },
    ],
  );
});

test("intent fidelity keeps meaningful decimals without trailing zeroes", () => {
  const whole = buildKpiRects(measuredSnapshot)[2];
  const fractional = buildKpiRects({
    ...measuredSnapshot,
    intent_fidelity_pct: 99.94,
  })[2];
  const roundedWhole = buildKpiRects({
    ...measuredSnapshot,
    intent_fidelity_pct: 99.96,
  })[2];

  assert.equal(whole.value, "100%");
  assert.equal(fractional.value, "99.9%");
  assert.equal(roundedWhole.value, "100%");
});

test("every KPI card links to one unique calculation contract", () => {
  const cards = buildKpiRects(measuredSnapshot);

  assert.deepEqual(
    cards.map(({ slug, href, label }) => ({ slug, href, label })),
    MONITOR_METRICS.map(({ slug, label }) => ({
      slug,
      href: `/monitor/${slug}`,
      label,
    })),
  );
  assert.equal(new Set(cards.map((card) => card.href)).size, cards.length);
  assert.equal(getMonitorMetric("does-not-exist"), undefined);
});

test("an empty measurement window is not presented as proof of safety", () => {
  const cards = buildKpiRects({
    ...measuredSnapshot,
    attacks_blocked: 0,
    authorized_count: 0,
    completed_count: 0,
    observed_attempts: 0,
    intent_fidelity_pct: null,
    median_sign_time_ms: null,
  });

  assert.ok(cards.every((card) => card.value === "—"));
  assert.ok(cards.every((card) => card.status === "not measured"));
});

test("refusal reasons distinguish unsafe requests from operational failures", () => {
  assert.deepEqual(classifyBlockReason("tuple_diverged"), {
    label: "Intent mismatch",
    tone: "risk",
  });
  assert.deepEqual(classifyBlockReason("capability_open_failed"), {
    label: "Capability error",
    tone: "operational",
  });
});

test("production monitor configuration redacts purchase details", () => {
  assert.deepEqual(getMonitorEnvironment("production"), {
    label: "Production",
    revealPurchaseDetails: false,
  });
  assert.equal(getMonitorEnvironment("sandbox").revealPurchaseDetails, true);
  assert.equal(getMonitorEnvironment("unexpected").revealPurchaseDetails, false);
});
