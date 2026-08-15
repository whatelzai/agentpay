export type MonitorEnvironment = {
  label: string;
  revealPurchaseDetails: boolean;
};

export function getMonitorEnvironment(
  value = process.env.STRAITSX_ENV,
): MonitorEnvironment {
  const environment = (value ?? "sandbox").trim().toLowerCase();

  if (environment === "sandbox") {
    return { label: "Sandbox", revealPurchaseDetails: true };
  }
  if (environment === "production") {
    return { label: "Production", revealPurchaseDetails: false };
  }
  return { label: "Environment undeclared", revealPurchaseDetails: false };
}
