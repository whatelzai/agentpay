"use client";

import { useState } from "react";
import { A2A_TRANSCRIPT, type TranscriptSpeaker } from "@/src/lib/store/a2a_transcript";

const SPEAKER_LABEL: Record<TranscriptSpeaker, string> = {
  shopping_agent: "Shopping Agent",
  peer_agent: "Peer Agent (untrusted)",
  user: "User",
  agentpay: "AgentPay",
};

const SPEAKER_STYLE: Record<TranscriptSpeaker, string> = {
  shopping_agent: "border-[#8ba7c9] bg-[#eef3f9] text-[#2c4b6e]",
  peer_agent: "border-[#e3a3a3] bg-[#fdecec] text-[#8a2c2c]",
  user: "border-[#e0d5c3] bg-white text-[#432b21]",
  agentpay: "border-[#c9a24a] bg-[#fdf3e0] text-[#6b4a12]",
};

export function A2AScript() {
  const [revealed, setRevealed] = useState(1);
  const done = revealed >= A2A_TRANSCRIPT.length;

  return (
    <div>
      <div className="space-y-3">
        {A2A_TRANSCRIPT.slice(0, revealed).map((line, index) => (
          <div
            key={index}
            className={`rounded-xl border p-4 ${SPEAKER_STYLE[line.speaker]}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wider mb-1 opacity-70">
              {SPEAKER_LABEL[line.speaker]}
            </p>
            <p className="text-sm whitespace-pre-wrap font-mono">{line.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        {!done ? (
          <button
            type="button"
            onClick={() => setRevealed((n) => Math.min(n + 1, A2A_TRANSCRIPT.length))}
            className="inline-flex items-center rounded-full bg-[#432b21] text-white text-sm font-semibold px-5 py-2.5 hover:bg-[#5a3a2c] transition-colors"
          >
            Next →
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setRevealed(1)}
            className="inline-flex items-center rounded-full border border-[#e0d5c3] bg-white text-sm font-semibold text-[#432b21] px-5 py-2.5 hover:bg-[#faf3e9] transition-colors"
          >
            ↺ Replay
          </button>
        )}
      </div>
    </div>
  );
}
