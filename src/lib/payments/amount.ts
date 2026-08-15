export const MIN_CARD_AMOUNT_CENTS = 500n;
export const MAX_CARD_AMOUNT_CENTS = 5_000n;

export function sgdToCents(value: unknown): bigint | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  const scaled = value * 100;
  const rounded = Math.round(scaled);
  if (
    !Number.isSafeInteger(rounded) ||
    Math.abs(scaled - rounded) > 1e-7
  ) {
    return null;
  }
  return BigInt(rounded);
}

export function isSupportedCardAmount(amountCents: bigint): boolean {
  return (
    amountCents >= MIN_CARD_AMOUNT_CENTS &&
    amountCents <= MAX_CARD_AMOUNT_CENTS
  );
}
