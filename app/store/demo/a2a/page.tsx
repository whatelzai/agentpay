import Link from "next/link";
import { A2AScript } from "./A2AScript";

export const metadata = {
  title: "A2A injection demo — The Corner Store",
  description: "Scripted transcript: a peer agent tries to redirect a purchase; AgentPay refuses.",
};

export default function A2ADemoPage() {
  return (
    <main className="min-h-screen bg-[#faf3e9] text-[#432b21]">
      <div className="max-w-2xl mx-auto px-6 py-14 md:py-20">
        <Link href="/store" className="text-sm font-medium text-[#c96a3e] hover:underline">
          ← The Corner Store
        </Link>

        <h1 className="text-2xl font-bold tracking-tight mt-6 mb-2">
          A2A injection — scripted transcript
        </h1>
        <p className="text-sm text-[#432b21]/70 mb-2">
          DEC-002&apos;s second live demo: the injected instruction comes from a peer
          agent (A2A), not a web page. Same Binding, different source.
        </p>
        <p className="text-xs text-[#432b21]/50 mb-8">
          This transcript is pre-written, not a live second agent — a live model reading
          the injected instruction might just refuse it, which would be an unreliable
          demo. The refusal mechanism itself (Tuple mismatch → Block Receipt) is the
          real, already-proven Mint Gate — the same code path the web-page injection
          scenario exercises live.
        </p>

        <A2AScript />
      </div>
    </main>
  );
}
