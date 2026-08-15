"use client";

import { useState, type FormEvent } from "react";

type Status = "idle" | "sending" | "sent" | "error";

export function FeedbackForm() {
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, comment }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "submit failed");
      }
      setStatus("sent");
      setEmail("");
      setComment("");
    } catch (caught) {
      setStatus("error");
      setErrorMsg((caught as Error).message);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        maxLength={254}
        className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
        aria-label="Email"
      />
      <textarea
        required
        placeholder="What's on your mind?"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={5}
        minLength={1}
        maxLength={4000}
        className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 resize-none"
        aria-label="Comment"
      />
      <div className="flex items-center gap-4 flex-wrap">
        <button
          type="submit"
          disabled={status === "sending" || status === "sent"}
          className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-6 py-2 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
        >
          {status === "sending"
            ? "Sending…"
            : status === "sent"
              ? "✓ Sent"
              : "Send"}
        </button>
        {status === "error" && (
          <p className="text-sm text-red-400">Error: {errorMsg}</p>
        )}
        {status === "sent" && (
          <p className="text-sm text-emerald-400">Thanks — got it.</p>
        )}
      </div>
    </form>
  );
}
