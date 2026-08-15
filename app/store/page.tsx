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
        <p className="text-sm text-[#432b21]/60 mb-1">☕ The Corner Store</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
          The Corner Store
        </h1>
        <p className="text-sm text-[#432b21]/60 mb-10">
          small orders, fast — not affiliated with AgentPay
        </p>

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
