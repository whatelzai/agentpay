"use client";

import { useState } from "react";

/**
 * Demo-only affordance (SIG-018 Q4): the payload is visually hidden by default,
 * same as it would be on a real poisoned page (off-screen div / HTML comment).
 * This toggle exposes it in place so judges can see it without live devtools.
 */
export function RevealPayload({ payload }: { payload: string }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setRevealed((value) => !value)}
        className="inline-flex items-center rounded-full border border-[#e0d5c3] bg-white text-sm font-semibold text-[#432b21] px-4 py-2 hover:bg-[#faf3e9] transition-colors"
      >
        🔍 {revealed ? "Hide" : "Reveal"} hidden text
      </button>

      {revealed ? (
        <div className="mt-3 rounded-xl border border-dashed border-[#b32a2a] bg-[#fdecec] p-4">
          <p className="text-xs font-semibold text-[#b32a2a] mb-2">
            HIDDEN ON REAL PAGE — normally invisible to a human reader
          </p>
          <code className="block text-xs font-mono text-[#432b21] whitespace-pre-wrap break-words">
            {payload}
          </code>
        </div>
      ) : (
        <span
          aria-hidden="true"
          className="sr-only absolute -left-[9999px]"
        >
          {payload}
        </span>
      )}
    </div>
  );
}
