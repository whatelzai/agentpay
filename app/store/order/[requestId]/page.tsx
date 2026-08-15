import Link from "next/link";
import { OrderStatus } from "./OrderStatus";

type Params = Promise<{ requestId: string }>;

export const metadata = { title: "Order status — The Corner Store" };

export default async function OrderPage({ params }: { params: Params }) {
  const { requestId } = await params;

  return (
    <main className="min-h-screen bg-[#faf3e9] text-[#432b21]">
      <div className="max-w-xl mx-auto px-6 py-14 md:py-20">
        <Link
          href="/store"
          className="text-sm font-medium text-[#c96a3e] hover:underline"
        >
          ← The Corner Store
        </Link>

        {/*
          Order details (product, amount, confirm link) are fetched
          client-side by OrderStatus via /api/store/orders/[requestId] -
          deliberately not looked up here. Vercel can run this page and that
          API route as separate serverless functions with separate in-memory
          state, so a server-side getOrder() here can 404 on an order the
          API route can see just fine. The API route is the single source
          of truth for order existence.
        */}
        <OrderStatus requestId={requestId} />
      </div>
    </main>
  );
}
