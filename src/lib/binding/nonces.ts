// Used-nonce store for Confirmation Tokens. One signature, one mint.
// In-memory per decision: enough for the demo. On Vercel this is per warm
// instance — replay protection is best-effort across instances, strict
// within one (and strict in the local stdio server).

const store = ((globalThis as Record<string, unknown>).__agentpayNonces ??=
  new Set<string>()) as Set<string>;

// Atomically claim a nonce. False = already used (replay).
export function claimNonce(nonce: string): boolean {
  if (store.has(nonce)) return false;
  store.add(nonce);
  return true;
}

// Release a claimed nonce when the mint fails downstream, so a transient
// rail error does not burn the user's confirmation.
export function releaseNonce(nonce: string): void {
  store.delete(nonce);
}
