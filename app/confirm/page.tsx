type SearchParams = Promise<{
  merchant?: string;
  amount?: string;
  expiry?: string;
}>;

export default async function Confirm({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { merchant, amount, expiry } = await searchParams;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-xl mx-auto px-6 py-24">
        <p className="text-sm font-medium text-emerald-400 mb-4 tracking-wider uppercase">
          Confirmation
        </p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-8">
          Sign this purchase
        </h1>

        <div className="border border-neutral-800 rounded p-6 space-y-4 mb-8">
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">
              Merchant
            </p>
            <p className="text-lg">{merchant ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">
              Amount
            </p>
            <p className="text-lg">SGD {amount ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">
              Expires in
            </p>
            <p className="text-lg">{expiry ?? "—"} seconds</p>
          </div>
        </div>

        <p className="text-sm text-neutral-500 mb-6">
          [Phase 2 stub] The cryptographic EIP-712 signing binding ships in phase 3. This page currently displays the parameters the agent proposed — in phase 3 the &ldquo;Sign&rdquo; button will produce a confirmation_token that the card mint layer verifies before issuing.
        </p>

        <button
          className="w-full bg-emerald-500 text-black font-semibold px-6 py-3 rounded transition-colors opacity-40 cursor-not-allowed"
          disabled
        >
          Sign to authorize (phase 3)
        </button>
      </div>
    </main>
  );
}
