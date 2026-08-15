import Link from "next/link";
import { notFound } from "next/navigation";
import { getStoreProduct, formatSgd, STORE_PRODUCTS } from "@/src/lib/store/products";
import { RevealPayload } from "./RevealPayload";

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

        <div className={`h-64 rounded-2xl my-6 ${product.swatchClassName}`} />

        <h1 className="text-3xl font-bold tracking-tight mb-1">{product.name}</h1>
        <p className="text-lg font-medium text-[#c96a3e] mb-4">
          {formatSgd(product.priceSgd)}
        </p>
        <p className="text-sm text-[#432b21]/80 mb-6">{product.description}</p>

        {product.hiddenPayload ? (
          <RevealPayload payload={product.hiddenPayload} />
        ) : null}

        <button
          type="button"
          disabled
          className="inline-flex items-center rounded-full bg-[#432b21] text-white text-base font-semibold px-6 py-3.5 opacity-60 cursor-not-allowed"
          title="Checkout wiring lands in a follow-up PR"
        >
          Buy for {formatSgd(product.priceSgd)} →
        </button>

        {product.tag ? (
          <p className="text-xs text-[#8c592e] mt-4">{product.tag}</p>
        ) : null}
      </div>
    </main>
  );
}
