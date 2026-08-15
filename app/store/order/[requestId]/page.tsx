import Link from "next/link";
import { OrderStatus } from "./OrderStatus";
import {
  buildDemoExecutionPlan,
  isDemoScenario,
} from "@/src/lib/store/demo_scenarios";

type Params = Promise<{ requestId: string }>;
type SearchParams = Promise<{ slug?: string; scenario?: string }>;

export const metadata = { title: "Order status — The Corner Store" };

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { requestId } = await params;
  const { slug, scenario } = await searchParams;
  let valid = Boolean(slug && isDemoScenario(scenario));
  if (valid && slug && isDemoScenario(scenario)) {
    try {
      buildDemoExecutionPlan(slug, scenario);
    } catch {
      valid = false;
    }
  }

  return (
    <main className="min-h-screen bg-[#faf3e9] text-[#432b21]">
      <div className="max-w-xl mx-auto px-6 py-14 md:py-20">
        <Link
          href="/store"
          className="text-sm font-medium text-[#c96a3e] hover:underline"
        >
          ← The Corner Store
        </Link>

        {valid && slug && isDemoScenario(scenario) ? (
          <OrderStatus requestId={requestId} slug={slug} scenario={scenario} />
        ) : (
          <div className="mt-8 rounded-xl border border-[#e3a3a3] bg-[#fdecec] p-5 text-sm">
            This sandbox result link is incomplete. Start a fresh scenario from
            the store.
          </div>
        )}
      </div>
    </main>
  );
}
