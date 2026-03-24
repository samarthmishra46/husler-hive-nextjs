'use client';

interface PricingCardProps {
  onSubscribe: () => void;
}

export default function PricingCard({ onSubscribe }: PricingCardProps) {
  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* Glow effect */}
      <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 opacity-20 blur-xl" />

      <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-b from-[#1a1a2e] to-[#16162a] p-8">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-4 py-1.5 text-sm text-amber-300 ring-1 ring-amber-500/20">
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
          Most Popular
        </div>

        <h3 className="text-2xl font-bold text-white">Pro Signals</h3>
        <p className="mt-2 text-gray-400">
          Premium Indian stock market trade signals delivered directly to
          Discord.
        </p>

        {/* Price */}
        <div className="mt-6 flex items-baseline gap-1">
          <span className="text-5xl font-bold text-white">₹999</span>
          <span className="text-gray-400">/month</span>
        </div>

        {/* Trial badge */}
        <div className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300 ring-1 ring-emerald-500/20">
          🎉 7-day free trial for new members
        </div>

        {/* Features */}
        <ul className="mt-8 space-y-4">
          {[
            'Real-time trade signals',
            'Private Discord channel access',
            'Indian stock market focus (NSE/BSE)',
            'Entry, exit & stop-loss levels',
            'Daily market analysis',
            'Priority support',
          ].map((feature) => (
            <li key={feature} className="flex items-center gap-3">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20">
                <svg
                  className="h-3 w-3 text-amber-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <span className="text-gray-300">{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          onClick={onSubscribe}
          className="mt-8 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 text-lg font-semibold text-black shadow-lg shadow-amber-500/25 transition-all hover:shadow-amber-500/40 hover:brightness-110 active:scale-[0.98]"
        >
          Start Free Trial →
        </button>

        <p className="mt-3 text-center text-xs text-gray-500">
          Cancel anytime. No hidden charges.
        </p>
      </div>
    </div>
  );
}
