import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder } from "@/src/lib/store/orders";
import { getStoreProduct, formatSgd } from "@/src/lib/store/products";
import { OrderStatus } from "./OrderStatus";

type Params = Promise<{ requestId: string }>;

export const metadata = { title: "Order status — The Corner Store" };

export default async function OrderPage({ params }: { params: Params }) {
  const { requestId } = await params;
  const order = getOrder(requestId);
  if (!order) notFound();

  const product = getStoreProduct(order.slug);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://agentpay-tan.vercel.app";
  const confirmUrl = `${baseUrl}/confirm?merchant=${encodeURIComponent(order.merchant)}&amount=${order.amountSgd}&expiry=300&rid=${requestId}&return_to=${encodeURIComponent(`/store/order/${requestId}`)}`;

  return (
    <main className="min-h-screen bg-[#faf3e9] text-[#432b21]">
      <div className="max-w-xl mx-auto px-6 py-14 md:py-20">
        <Link
          href="/store"
          className="text-sm font-medium text-[#c96a3e] hover:underline"
        >
          ← The Corner Store
        </Link>

        <h1 className="text-2xl font-bold tracking-tight mt-6 mb-1">
          Order for {product?.name ?? order.slug}
        </h1>
        <p className="text-sm text-[#432b21]/60 mb-8">
          {formatSgd(order.amountSgd)} · {order.merchant} · {requestId}
        </p>

        <OrderStatus requestId={requestId} confirmUrl={confirmUrl} />
      </div>
    </main>
  );
}
