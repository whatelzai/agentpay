export const MONITOR_METRIC_SLUGS = [
  "safety-incidents",
  "safety-refusals",
  "intent-fidelity",
  "median-sign",
] as const;

export type MonitorMetricSlug = (typeof MONITOR_METRIC_SLUGS)[number];

export type MonitorMetricDefinition = {
  slug: MonitorMetricSlug;
  label: string;
  summary: string;
  formula: string;
  calculation: string;
  sourceField: string;
  target: string;
  included: readonly string[];
  excluded: readonly string[];
  interpretation: readonly {
    label: string;
    description: string;
    tone: "healthy" | "neutral" | "warning" | "danger";
  }[];
  limitation: string;
};

export const MONITOR_METRICS: readonly MonitorMetricDefinition[] = [
  {
    slug: "safety-incidents",
    label: "Safety incidents",
    summary:
      "Payments recorded as unsafe or unresolved after money may have moved.",
    formula: 'COUNT(spend outcomes recorded as "unauthorized")',
    calculation:
      "AgentPay counts each rolling-window execution outcome that requires incident review. Today this includes post-payment rail failures where settlement may have occurred but a card was not returned. Each recorded row counts once.",
    sourceField: "kpi_snapshot.unauthorized_spends",
    target: "0 incidents in the rolling window",
    included: [
      "Outcomes explicitly recorded as unauthorized by execute_purchase.",
      "Post-payment rail failures where settlement remains unresolved.",
    ],
    excluded: [
      "Requests refused before any payment was sent.",
      "Authorized outcomes with a verified signed-intent match.",
      "Missing telemetry, which is displayed as not measured rather than zero.",
    ],
    interpretation: [
      {
        label: "On target",
        description: "A measured sample exists and the incident count is zero.",
        tone: "healthy",
      },
      {
        label: "Incident",
        description: "Any value above zero requires investigation and reconciliation.",
        tone: "danger",
      },
      {
        label: "Not measured",
        description: "Telemetry is unavailable or no decision sample exists.",
        tone: "neutral",
      },
    ],
    limitation:
      "A zero proves only that no incident was observed in the measured sample. It does not prove safety when telemetry is missing, stale, or has no recorded decisions.",
  },
  {
    slug: "safety-refusals",
    label: "Safety refusals",
    summary:
      "Execution requests that failed closed before AgentPay allowed the purchase.",
    formula: "COUNT(fail-closed spend decisions in the rolling window)",
    calculation:
      "AgentPay counts the fail-closed decisions returned by the KPI snapshot. The aggregate includes verified unsafe requests and operational refusals, so the scoreboard deliberately calls them refusals rather than attacks.",
    sourceField: "kpi_snapshot.attacks_blocked",
    target: "Observed for context; not treated as a success target",
    included: [
      "Signed-intent mismatches and replay attempts.",
      "Invalid signatures, payment proofs, and capabilities.",
      "Policy, configuration, and pre-payment rail refusals.",
    ],
    excluded: [
      "Authorized executions.",
      "Post-payment outcomes requiring incident reconciliation.",
      "An assumption that every refusal was malicious.",
    ],
    interpretation: [
      {
        label: "Observed",
        description: "Refusals were measured; use the classified feed to understand why.",
        tone: "neutral",
      },
      {
        label: "Operational warning",
        description: "Repeated capability or configuration failures may indicate broken integration rather than attack traffic.",
        tone: "warning",
      },
      {
        label: "Not measured",
        description: "Telemetry is unavailable or no decision sample exists.",
        tone: "neutral",
      },
    ],
    limitation:
      "A high refusal count is not automatically good or bad. It may show a control working, malformed requests, retries, or an integration problem; the reason classification supplies the missing context.",
  },
  {
    slug: "intent-fidelity",
    label: "Intent fidelity",
    summary:
      "The share of outcomes that may have moved money and remained safely authorized.",
    formula:
      "authorized outcomes ÷ (authorized outcomes + safety incidents) × 100",
    calculation:
      "Only outcomes that moved or may have moved money enter the denominator. Refused requests are excluded because the binding stopped them before payment. If no execution outcome exists, fidelity is not measured.",
    sourceField:
      "kpi_snapshot.authorized_count and kpi_snapshot.unauthorized_spends",
    target: "100% of measured execution outcomes",
    included: [
      "Authorized outcomes whose merchant and amount passed signed-intent verification.",
      "Safety incidents and unresolved post-payment outcomes as the conservative failure set.",
    ],
    excluded: [
      "Requests refused before money moved.",
      "Confirmation sessions that never reached execution.",
      "Windows with no execution outcome, which display as not measured.",
    ],
    interpretation: [
      {
        label: "On target",
        description: "Every measured execution outcome was safely authorized.",
        tone: "healthy",
      },
      {
        label: "Below target",
        description: "At least one measured outcome is unsafe or unresolved.",
        tone: "danger",
      },
      {
        label: "Not measured",
        description: "No outcome moved or may have moved money in the window.",
        tone: "neutral",
      },
    ],
    limitation:
      "Intent fidelity measures execution safety, not whether valid users were wrongly refused. False-refusal rate needs a separate valid-intent denominator that is not yet instrumented.",
  },
  {
    slug: "median-sign",
    label: "Median sign",
    summary:
      "The typical wall-clock time for a human to open and sign a confirmation.",
    formula: "P50(signed_at − opened_at)",
    calculation:
      "AgentPay calculates the elapsed time for confirmation records that have both an opened and signed timestamp, then reports the 50th percentile. The displayed value converts milliseconds to seconds with one decimal place.",
    sourceField: "kpi_snapshot.median_sign_time_ms",
    target: "Less than 60 seconds",
    included: [
      "Confirmation sessions with both opened_at and signed_at timestamps.",
      "Durations returned by the rolling KPI snapshot.",
    ],
    excluded: [
      "Sessions that were never opened or never signed.",
      "Purchase execution and payment-rail processing time.",
      "Missing timing telemetry, which displays as not measured.",
    ],
    interpretation: [
      {
        label: "On target",
        description: "The measured median is below 60 seconds.",
        tone: "healthy",
      },
      {
        label: "Needs attention",
        description: "The measured median is 60 seconds or longer.",
        tone: "warning",
      },
      {
        label: "Not measured",
        description: "No complete open-to-sign timing sample is available.",
        tone: "neutral",
      },
    ],
    limitation:
      "The median describes the middle completed signing session. It does not expose slow-tail behavior or abandonment; p95 sign time and confirmation abandonment should be tracked separately.",
  },
] as const;

export function getMonitorMetric(
  slug: string,
): MonitorMetricDefinition | undefined {
  return MONITOR_METRICS.find((metric) => metric.slug === slug);
}
