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
    <form onSubmit={submit} className="space-y-4">
      <input
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        maxLength={254}
        className="w-full bg-transparent border-b border-rule px-0 py-2 text-ink placeholder:text-muted focus:outline-none focus:border-ink transition-colors"
        aria-label="Email"
      />
      <textarea
        required
        placeholder="What could be sharper?"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={4}
        minLength={1}
        maxLength={4000}
        className="w-full bg-transparent border-b border-rule px-0 py-2 text-ink placeholder:text-muted focus:outline-none focus:border-ink transition-colors resize-none"
        aria-label="Comment"
      />
      <div className="flex items-center gap-4 flex-wrap pt-2">
        <button
          type="submit"
          disabled={status === "sending" || status === "sent"}
          className="bg-ink text-paper px-6 py-2.5 text-sm hover:bg-seal transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
        >
          {status === "sending"
            ? "Sending…"
            : status === "sent"
              ? "Sent"
              : "Send"}
        </button>
        {status === "error" && (
          <p className="text-sm text-seal">{errorMsg}</p>
        )}
        {status === "sent" && (
          <p className="text-sm text-muted italic">Thanks — got it.</p>
        )}
      </div>
    </form>
  );
}
