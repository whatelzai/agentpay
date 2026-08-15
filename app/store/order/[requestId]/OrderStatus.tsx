"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatSgd } from "@/src/lib/store/products";
import {
  attemptStorageKey,
  buildDemoExecutionPlan,
  capabilityStorageKey,
  demoReturnPath,
  resultStorageKey,
  type DemoScenario,
} from "@/src/lib/store/demo_scenarios";

type OrderReceipt = {
  id?: string;
  type: "MINTED" | "REFUSED";
  settlementTx?: string;
  snowtraceUrl?: string;
  amountSgd?: string;
  reason?: string;
  signature?: string;
  signedBy?: string;
  degraded?: boolean;
};

type DemoExecutionResponse = {
  status: "settled" | "refused" | "rail_failed";
  request_id: string;
  scenario: DemoScenario;
  confirmed: { merchant: string; amountSgd: number };
  requested: { merchant: string; amountSgd: number };
  receipt?: OrderReceipt;
  detail?: string;
};

type Phase =
  | "loading"
  | "awaiting_capability"
  | "executing"
  | "complete"
  | "uncertain";

const CONFIRM_EXPIRY_SECONDS = 300;

function buildConfirmUrl(
  requestId: string,
  slug: string,
  scenario: DemoScenario,
  merchant: string,
  amountSgd: number,
): string {
  const params = new URLSearchParams({
    merchant,
    amount: String(amountSgd),
    expiry: String(CONFIRM_EXPIRY_SECONDS),
    rid: requestId,
    return_to: demoReturnPath(requestId, slug, scenario),
  });
  return `/confirm?${params.toString()}`;
}

function TupleCard({
  eyebrow,
  merchant,
  amountSgd,
  danger = false,
}: {
  eyebrow: string;
  merchant: string;
  amountSgd: number;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        danger
          ? "border-[#e3a3a3] bg-[#fdecec]"
          : "border-[#bcd6a8] bg-[#eef6e6]"
      }`}
    >
      <p
        className={`text-[10px] font-bold uppercase tracking-[0.15em] ${
          danger ? "text-[#b32a2a]" : "text-[#3e6b2a]"
        }`}
      >
        {eyebrow}
      </p>
      <p className="mt-3 text-lg font-semibold">{merchant}</p>
      <p className="font-mono text-sm text-[#432b21]/70">
        {formatSgd(amountSgd)}
      </p>
    </div>
  );
}

export function OrderStatus({
  requestId,
  slug,
  scenario,
}: {
  requestId: string;
  slug: string;
  scenario: DemoScenario;
}) {
  const plan = buildDemoExecutionPlan(slug, scenario);
  const [phase, setPhase] = useState<Phase>("loading");
  const [capability, setCapability] = useState<string | null>(null);
  const [manualCapability, setManualCapability] = useState("");
  const [data, setData] = useState<DemoExecutionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const cached = sessionStorage.getItem(resultStorageKey(requestId));
        if (cached) {
          setData(JSON.parse(cached) as DemoExecutionResponse);
          setPhase("complete");
          return;
        }
        if (sessionStorage.getItem(attemptStorageKey(requestId))) {
          setPhase("uncertain");
          return;
        }
        const storedCapability = sessionStorage.getItem(
          capabilityStorageKey(requestId),
        );
        if (storedCapability) {
          setCapability(storedCapability);
          setPhase("executing");
        } else {
          setPhase("awaiting_capability");
        }
      } catch {
        setPhase("awaiting_capability");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [requestId]);

  useEffect(() => {
    if (!capability || started.current) return;
    started.current = true;
    let responseReceived = false;

    async function executeOnce() {
      setError(null);
      setPhase("executing");
      try {
        sessionStorage.setItem(
          attemptStorageKey(requestId),
          new Date().toISOString(),
        );
        const response = await fetch("/api/store/demo-execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            request_id: requestId,
            slug,
            scenario,
            confirmation_token: capability,
          }),
        });
        responseReceived = true;
        const body = (await response.json()) as DemoExecutionResponse & {
          error?: string;
        };
        if (!response.ok) {
          sessionStorage.removeItem(attemptStorageKey(requestId));
          started.current = false;
          throw new Error(body.error ?? "demo execution failed");
        }
        sessionStorage.setItem(resultStorageKey(requestId), JSON.stringify(body));
        sessionStorage.removeItem(capabilityStorageKey(requestId));
        setData(body);
        setPhase("complete");
      } catch (caught) {
        setError((caught as Error).message);
        setPhase(responseReceived ? "awaiting_capability" : "uncertain");
      }
    }

    void executeOnce();
  }, [capability, requestId, scenario, slug]);

  function usePastedCapability() {
    const value = manualCapability.trim();
    if (!value) return;
    try {
      sessionStorage.setItem(capabilityStorageKey(requestId), value);
      sessionStorage.removeItem(resultStorageKey(requestId));
      sessionStorage.removeItem(attemptStorageKey(requestId));
    } catch {
      // The request can still proceed from component state.
    }
    started.current = false;
    setCapability(value);
  }

  const tuplesDiffer =
    plan.confirmed.merchant !== plan.requested.merchant ||
    plan.confirmed.amountSgd !== plan.requested.amountSgd;
  const confirmUrl = buildConfirmUrl(
    requestId,
    slug,
    scenario,
    plan.confirmed.merchant,
    plan.confirmed.amountSgd,
  );

  return (
    <div>
      <div className="mt-6 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em]">
        <span className="rounded-full bg-[#432b21] px-3 py-1.5 text-white">
          Live sandbox run
        </span>
        <span className="rounded-full border border-[#d6c7b0] px-3 py-1.5">
          No real money
        </span>
        <span className="font-mono text-[#8c6f5a]">{requestId}</span>
      </div>

      <h1 className="mt-6 text-3xl font-bold tracking-tight">
        {scenario === "web_injection"
          ? "The agent changed the purchase."
          : scenario === "rail_limit"
            ? "The Tuple matches. Now the rail decides."
            : "The agent preserved the signed intent."}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[#432b21]/65">
        Same Mint Gate in every scenario. Only the requested Tuple changes.
      </p>

      <div className="my-8 grid gap-4 sm:grid-cols-2">
        <TupleCard
          eyebrow="Human signed"
          merchant={plan.confirmed.merchant}
          amountSgd={plan.confirmed.amountSgd}
        />
        <TupleCard
          eyebrow="Agent requested"
          merchant={plan.requested.merchant}
          amountSgd={plan.requested.amountSgd}
          danger={tuplesDiffer}
        />
      </div>

      {phase === "loading" || phase === "executing" ? (
        <div className="rounded-xl border border-[#d6c7b0] bg-white p-6">
          <p className="text-sm font-semibold">Mint Gate comparing signatures...</p>
          <p className="mt-2 text-xs text-[#432b21]/60">
            The opaque capability is opened only inside AgentPay. The browser
            never exposes the linked payment signature to the demo agent.
          </p>
        </div>
      ) : null}

      {phase === "awaiting_capability" ? (
        <div className="rounded-xl border border-[#d6c7b0] bg-white p-6">
          <p className="text-sm font-semibold">A sealed confirmation is required.</p>
          <p className="mt-2 text-sm text-[#432b21]/65">
            Return to the wallet confirmation, or paste the opaque capability
            if the browser blocked the same-tab handoff.
          </p>
          <a
            href={confirmUrl}
            className="mt-4 inline-flex rounded-full bg-[#432b21] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Go sign the exact Tuple -&gt;
          </a>
          <label className="mt-5 block text-xs font-semibold uppercase tracking-wider text-[#765844]">
            Sealed capability fallback
            <textarea
              value={manualCapability}
              onChange={(event) => setManualCapability(event.target.value)}
              rows={3}
              className="mt-2 w-full rounded-lg border border-[#d6c7b0] bg-[#fffdf9] p-3 font-mono text-xs normal-case tracking-normal"
              placeholder="apc1..."
            />
          </label>
          <button
            type="button"
            onClick={usePastedCapability}
            className="mt-3 rounded-full border border-[#432b21] px-5 py-2 text-sm font-semibold"
          >
            Submit capability once
          </button>
        </div>
      ) : null}

      {phase === "uncertain" ? (
        <div className="rounded-xl border border-[#e8c98a] bg-[#fdf3e0] p-6">
          <p className="text-sm font-semibold text-[#8a5a1a]">
            Result unknown - automatic retry stopped
          </p>
          <p className="mt-2 text-sm text-[#432b21]/75">
            The browser submitted this capability but did not receive a result.
            AgentPay will not retry a potentially paid request automatically.
            Check the wallet and StraitsX sandbox before starting a fresh run.
          </p>
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm text-[#b32a2a]">{error}</p> : null}

      {phase === "complete" && data?.status === "settled" ? (
        <div className="rounded-xl border border-[#8fc77a] bg-[#eaf7df] p-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#3e6b2a]">
            AgentPay allowed / StraitsX settled
          </p>
          <p className="mt-3 text-xl font-semibold">Exact intent preserved.</p>
          <p className="mt-2 text-sm text-[#432b21]/75">
            The signed and requested Tuples matched. Card credentials remain
            withheld from the agent.
          </p>
          {data.receipt?.snowtraceUrl ? (
            <a
              href={data.receipt.snowtraceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex text-sm font-semibold text-[#c96a3e] underline"
            >
              View the sandbox settlement on Snowtrace -&gt;
            </a>
          ) : null}
        </div>
      ) : null}

      {phase === "complete" && data?.status === "refused" ? (
        <div className="rounded-xl border border-[#e3a3a3] bg-[#fdecec] p-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#b32a2a]">
            AgentPay refused / StraitsX never called
          </p>
          <p className="mt-3 text-xl font-semibold">Money did not move.</p>
          <p className="mt-2 text-sm text-[#432b21]/75">
            {data.receipt?.reason ?? "The request did not match signed intent."}
          </p>
          <div className="mt-4 rounded-lg border border-[#e3a3a3] bg-white/60 p-4 font-mono text-xs">
            <p>
              agent asked: {data.requested.merchant} / {formatSgd(data.requested.amountSgd)}
            </p>
            <p>
              human signed: {data.confirmed.merchant} / {formatSgd(data.confirmed.amountSgd)}
            </p>
          </div>
          <p className="mt-4 text-xs text-[#765844]">
            {data.receipt?.signature
              ? `Cryptographically signed Block Receipt ${data.receipt.id}`
              : `Sandbox Block Receipt ${data.receipt?.id ?? "logged"} (unsigned demo mode)`}
          </p>
        </div>
      ) : null}

      {phase === "complete" && data?.status === "rail_failed" ? (
        <div className="rounded-xl border border-[#e8c98a] bg-[#fdf3e0] p-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8a5a1a]">
            AgentPay allowed / StraitsX declined
          </p>
          <p className="mt-3 text-xl font-semibold">
            Correct intent. The rail did not settle.
          </p>
          <p className="mt-2 text-sm text-[#432b21]/75">
            AgentPay verified an exact Tuple match. The sandbox rail made the
            final funding or issuance decision, so this is not reported as a
            prompt-injection block.
          </p>
          <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-lg bg-white/60 p-4 text-xs text-[#6b4615]">
            {data.detail}
          </pre>
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link href="/store" className="font-semibold text-[#c96a3e] hover:underline">
          Run another scenario
        </Link>
        <Link href="/monitor" className="font-semibold text-[#c96a3e] hover:underline">
          Open the public safety monitor
        </Link>
      </div>
    </div>
  );
}
