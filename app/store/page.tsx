import Link from "next/link";
import { STORE_PRODUCTS, formatSgd } from "@/src/lib/store/products";

export const metadata = {
  title: "The Corner Store",
  description: "Small orders, fast. Not affiliated with AgentPay.",
};

export default function StorePage() {
  return (
    <main className="min-h-screen bg-[#faf3e9] text-[#432b21]">
      <div className="max-w-5xl mx-auto px-6 py-14 md:py-20">
        <Link
          href="/"
          className="text-xs font-semibold uppercase tracking-[0.14em] text-[#c96a3e] hover:underline"
        >
          AgentPay home
        </Link>
        <p className="text-sm text-[#432b21]/60 mb-1">☕ The Corner Store</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
          The Corner Store
        </h1>
        <p className="text-sm text-[#432b21]/60 mb-5">
          small orders, fast — not affiliated with AgentPay
        </p>

        <div className="mb-10 flex flex-wrap items-center gap-2 rounded-xl border border-[#d6c7b0] bg-white/60 p-4 text-[11px] font-semibold uppercase tracking-[0.14em]">
          <span className="rounded-full bg-[#432b21] px-3 py-1.5 text-white">
            Live StraitsX Sandbox
          </span>
          <span>Avalanche Fuji</span>
          <span className="text-[#8c6f5a]">No real funds or production claims</span>
        </div>

        <section className="mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8c592e]">
            The two-act safety demo
          </p>
          <h2 className="mt-2 max-w-3xl text-2xl font-bold tracking-tight md:text-3xl">
            One protocol. Two outcomes. The binding gets the credit either way.
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Link
              href="/store/latte-1#s1"
              className="rounded-xl border border-[#bcd6a8] bg-[#eef6e6] p-5 transition-transform hover:-translate-y-1"
            >
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#3e6b2a]">
                S1 / Exact match
              </p>
              <p className="mt-2 font-semibold">AgentPay allows</p>
              <p className="mt-1 text-sm text-[#432b21]/65">
                Signed Latte in. The same Latte comes out.
              </p>
            </Link>
            <Link
              href="/store/latte-2#s2"
              className="rounded-xl border border-[#e3a3a3] bg-[#fdecec] p-5 transition-transform hover:-translate-y-1"
            >
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#b32a2a]">
                S2 / Prompt injection
              </p>
              <p className="mt-2 font-semibold">AgentPay refuses</p>
              <p className="mt-1 text-sm text-[#432b21]/65">
                The agent mutates merchant and amount after signing.
              </p>
            </Link>
          </div>
        </section>

        <div className="border-t border-[#e0d5c3] mb-10" />

        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {STORE_PRODUCTS.map((product) => (
            <Link
              key={product.slug}
              href={`/store/${product.slug}`}
              className="block rounded-2xl bg-white p-5 hover:shadow-md transition-shadow"
            >
              <div
                className={`h-40 rounded-xl mb-4 ${product.swatchClassName}`}
              />
              <p className="text-2xl mb-2">{product.emoji}</p>
              <h2 className="text-lg font-semibold mb-1">{product.name}</h2>
              <p className="text-sm font-medium text-[#c96a3e] mb-2">
                {formatSgd(product.priceSgd)}
              </p>
              <p className="text-sm text-[#432b21]/65 mb-4">
                {product.description}
              </p>
              <span className="inline-flex items-center rounded-full bg-[#432b21] text-white text-sm font-semibold px-4 py-2">
                View item →
              </span>
              {product.tag ? (
                <p className="text-xs text-[#8c592e] mt-3">{product.tag}</p>
              ) : null}
            </Link>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-[#e0d5c3]">
          <Link
            href="/store/demo/a2a"
            className="text-sm font-medium text-[#c96a3e] hover:underline"
          >
            See the A2A injection demo (scripted transcript) →
          </Link>
        </div>
      </div>
    </main>
  );
}
