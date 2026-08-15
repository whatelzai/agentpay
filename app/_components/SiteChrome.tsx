import Link from "next/link";
import type { ReactNode } from "react";

export const siteFrameClassName =
  "mx-auto w-full max-w-6xl px-6 md:px-10";

export function AgentPayMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4 10 C 10 14, 14 20, 22 22"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
      <circle cx="24" cy="22" r="3.25" fill="#39FF14" />
    </svg>
  );
}

export function SiteHeader({
  active,
}: {
  active?: "home" | "monitor";
}) {
  return (
    <header className="w-full">
      <div
        className={`${siteFrameClassName} flex min-h-20 items-center justify-between gap-6 py-5 md:min-h-24 md:py-7`}
      >
        <Link
          href="/"
          aria-current={active === "home" ? "page" : undefined}
          className="flex shrink-0 items-center gap-2 text-ink transition-colors hover:text-neon focus-visible:outline-none focus-visible:text-neon"
          aria-label="AgentPay home"
        >
          <AgentPayMark className="h-6 w-6" />
          <span className="font-mono text-sm uppercase tracking-[0.14em]">
            agentpay
          </span>
        </Link>
        <nav
          aria-label="Primary navigation"
          className="flex items-center gap-5 font-mono text-[11px] uppercase tracking-[0.14em] sm:gap-6 sm:text-xs"
        >
          <Link
            href="/monitor"
            aria-current={active === "monitor" ? "page" : undefined}
            className={
              active === "monitor"
                ? "text-ink"
                : "text-muted transition-colors hover:text-neon focus-visible:outline-none focus-visible:text-neon"
            }
          >
            Scorecard
          </Link>
          <a
            href="https://github.com/whatelzai/agentpay"
            className="text-muted transition-colors hover:text-neon focus-visible:outline-none focus-visible:text-neon"
          >
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}

export function SectionKicker({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
      <span className="h-px w-8 bg-neon" aria-hidden="true" />
      {children}
    </p>
  );
}

export function SiteFooter() {
  return (
    <footer
      className={`${siteFrameClassName} flex flex-col gap-4 border-t border-rule py-10 md:flex-row md:items-center md:justify-between`}
    >
      <div className="flex items-start gap-2 font-mono text-[11px] uppercase leading-relaxed tracking-[0.14em] text-muted">
        <AgentPayMark className="h-4 w-4 shrink-0" />
        <p>
          agentpay &middot; signed at{" "}
          <a
            href="https://straitsx.com"
            className="transition-colors hover:text-neon focus-visible:outline-none focus-visible:text-neon"
          >
            StraitsX AgentiX Playground
          </a>
          <span className="block sm:inline">
            {" "}
            &middot; SG &middot; 14-16 Aug 2026
          </span>
        </p>
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
        Track: Agentic Payments Infrastructure
      </p>
    </footer>
  );
}
