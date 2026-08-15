// Confirmation hand-off store: the /confirm page POSTs the signed token
// under a request id; the get_confirmation tool polls it. Removes the
// manual copy-paste hop (which stays available as fallback).
//
// First write wins: once a token is stored for a request id, it cannot be
// overwritten — a late or malicious second POST cannot swap the user's
// signature. (A forged token could not mint anyway: the Mint Gate's owner
// check refuses signers that are not OWNER_ADDRESS.)
//
// In-memory per decision. On Vercel this is per warm instance; the demo
// runs one instance (or local dev) where this is strict.

import { decodeToken } from "./binding/verify";

const store = ((globalThis as Record<string, unknown>).__agentpayConfirmations ??=
  new Map<string, string>()) as Map<string, string>;

const MAX_ENTRIES = 1000;

export function isRequestId(value: string): boolean {
  return /^req_[0-9a-f]{16}$/.test(value);
}

export type PutResult = "stored" | "duplicate" | "invalid";

export function putConfirmation(requestId: string, token: string): PutResult {
  if (!isRequestId(requestId) || typeof token !== "string" || token.length > 4096) {
    return "invalid";
  }
  try {
    decodeToken(token);
  } catch {
    return "invalid";
  }
  if (store.has(requestId)) return "duplicate";
  if (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
  store.set(requestId, token);
  return "stored";
}

export function getConfirmation(requestId: string): string | undefined {
  return store.get(requestId);
}
