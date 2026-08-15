import Link from "next/link";
import { notFound } from "next/navigation";
import { getStoreProduct, formatSgd, STORE_PRODUCTS } from "@/src/lib/store/products";
import { RevealPayload } from "./RevealPayload";
import { CheckoutButton } from "./CheckoutButton";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return STORE_PRODUCTS.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const product = getStoreProduct(slug);
  return { title: product ? `${product.name} — The Corner Store` : "The Corner Store" };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = getStoreProduct(slug);
  if (!product) notFound();

  return (
    <main className="min-h-screen bg-[#faf3e9] text-[#432b21]">
      <div className="max-w-2xl mx-auto px-6 py-14 md:py-20">
        <Link
          href="/store"
          className="text-sm font-medium text-[#c96a3e] hover:underline"
        >
          ← The Corner Store
        </Link>

        <div className="mt-6 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em]">
          <span className="rounded-full bg-[#432b21] px-3 py-1.5 text-white">
            StraitsX Sandbox
          </span>
          <span className="rounded-full border border-[#d6c7b0] px-3 py-1.5 text-[#765844]">
            Avalanche Fuji
          </span>
          <span className="text-[#8c6f5a]">No real money</span>
        </div>

        <div className={`h-64 rounded-2xl my-6 ${product.swatchClassName}`} />

        <h1 className="text-3xl font-bold tracking-tight mb-1">{product.name}</h1>
        <p className="text-lg font-medium text-[#c96a3e] mb-4">
          {formatSgd(product.priceSgd)}
        </p>
        <p className="text-sm text-[#432b21]/80 mb-6">{product.description}</p>

        {product.hiddenPayload ? (
          <RevealPayload payload={product.hiddenPayload} />
        ) : null}

        {product.slug === "latte" ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <section
              id="s1"
              className="rounded-xl border border-[#bcd6a8] bg-[#eef6e6] p-5"
            >
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#3e6b2a]">
                S1 / Exact intent
              </p>
              <p className="my-3 text-sm leading-relaxed text-[#432b21]/75">
                Sign Latte at SGD 5.00. The demo agent requests exactly that
                Tuple, so AgentPay can submit it to the sandbox rail.
              </p>
              <CheckoutButton
                slug={product.slug}
                priceSgd={product.priceSgd}
                scenario="happy_path"
                label="Run the safe path ->"
              />
            </section>
            <section
              id="s2"
              className="rounded-xl border border-[#e3a3a3] bg-[#fdecec] p-5"
            >
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#b32a2a]">
                S2 / Inject after signing
              </p>
              <p className="my-3 text-sm leading-relaxed text-[#432b21]/75">
                Sign the same Latte. This scripted fallback replays the hidden
                page instruction deterministically, so AgentPay refuses the
                mismatch every time. The live attack is a recorded real-agent
                run on the MCP connector.
              </p>
              <CheckoutButton
                slug={product.slug}
                priceSgd={product.priceSgd}
                scenario="web_injection"
                label="Run the injected path ->"
                tone="attack"
              />
            </section>
          </div>
        ) : product.slug === "weekly-grocery-bundle" ? (
          <section
            id="s3"
            className="mt-8 rounded-xl border border-[#e8c98a] bg-[#fdf3e0] p-5"
          >
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8a5a1a]">
              S3 / Rail boundary
            </p>
            <p className="my-3 text-sm leading-relaxed text-[#432b21]/75">
              AgentPay receives an exact Tuple match. The StraitsX sandbox rail
              still decides whether the wallet can fund SGD 28.00.
            </p>
            <CheckoutButton
              slug={product.slug}
              priceSgd={product.priceSgd}
              scenario="rail_limit"
              label="Run the rail-limit path ->"
              tone="rail"
            />
          </section>
        ) : (
          <CheckoutButton
            slug={product.slug}
            priceSgd={product.priceSgd}
            scenario="happy_path"
          />
        )}

        {product.tag ? (
          <p className="text-xs text-[#8c592e] mt-4">{product.tag}</p>
        ) : null}
      </div>
    </main>
  );
}
