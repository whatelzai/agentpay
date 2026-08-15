// Confirmation hand-off store: the /confirm page POSTs the signed payload
// under a request id; AgentPay stores and returns only an encrypted capability.
// The untrusted agent never receives the reusable payment signature.
//
// First write wins: once a token is stored for a request id, it cannot be
// overwritten. Version 2 also signs the request id, so a valid token cannot be
// moved from one proposal to another.
//
// In-memory per decision. On Vercel this is per warm instance; the demo
// runs one instance (or local dev) where this is strict.

import { decodeToken } from "./binding/verify";
import { sealConfirmationToken } from "./signing/confirmation_seal";

const store = ((globalThis as Record<string, unknown>)
  .__agentpaySealedConfirmationsV1 ??= new Map<string, string>()) as Map<
  string,
  string
>;

const MAX_ENTRIES = 1000;

export function isRequestId(value: string): boolean {
  return /^req_[0-9a-f]{16}$/.test(value);
}

export type PutResult = "stored" | "duplicate" | "invalid" | "unavailable";

export function putConfirmation(requestId: string, token: string): PutResult {
  if (
    !isRequestId(requestId) ||
    typeof token !== "string" ||
    token.length > 16_384
  ) {
    return "invalid";
  }
  let decoded;
  try {
    decoded = decodeToken(token);
  } catch {
    return "invalid";
  }
  if (decoded.version === 2 && decoded.requestId !== requestId) {
    return "invalid";
  }
  if (store.has(requestId)) return "duplicate";
  let capability: string;
  try {
    capability = sealConfirmationToken(token);
  } catch {
    return "unavailable";
  }
  if (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
  store.set(requestId, capability);
  return "stored";
}

export function getConfirmation(requestId: string): string | undefined {
  return store.get(requestId);
}
