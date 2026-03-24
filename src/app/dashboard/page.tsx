'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function DashboardContent() {
  const searchParams = useSearchParams();
  const discordStatus = searchParams.get('discord');

  return (
    <div className="min-h-[80vh] px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="animate-fade-in">
          {/* Success banner */}
          {discordStatus === 'connected' && (
            <div className="mb-8 rounded-2xl bg-emerald-500/10 p-6 ring-1 ring-emerald-500/20">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
                  <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-emerald-300">Discord Connected!</h3>
                  <p className="text-sm text-emerald-300/70">
                    You&apos;ve been added to the private signals channel. Check your Discord!
                  </p>
                </div>
              </div>
            </div>
          )}

          {discordStatus === 'reconnected' && (
            <div className="mb-8 rounded-2xl bg-blue-500/10 p-6 ring-1 ring-blue-500/20">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20">
                  <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-blue-300">Discord Reconnected</h3>
                  <p className="text-sm text-blue-300/70">Your Discord account has been updated.</p>
                </div>
              </div>
            </div>
          )}

          {/* Welcome */}
          <h1 className="text-3xl font-bold text-white">Welcome to Hustlers Hive! 🐝</h1>
          <p className="mt-2 text-gray-400">
            You&apos;re all set. Here&apos;s what you need to know.
          </p>

          {/* Info cards */}
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="glass-card rounded-2xl p-6">
              <div className="mb-3 text-3xl">📊</div>
              <h3 className="font-semibold text-white">Trading Signals</h3>
              <p className="mt-1 text-sm text-gray-400">
                Real-time signals are posted in the private Discord channel. Keep notifications on!
              </p>
            </div>

            <div className="glass-card rounded-2xl p-6">
              <div className="mb-3 text-3xl">⏰</div>
              <h3 className="font-semibold text-white">Market Hours</h3>
              <p className="mt-1 text-sm text-gray-400">
                Most signals are posted during market hours: 9:15 AM – 3:30 PM IST.
              </p>
            </div>

            <div className="glass-card rounded-2xl p-6">
              <div className="mb-3 text-3xl">💳</div>
              <h3 className="font-semibold text-white">Subscription</h3>
              <p className="mt-1 text-sm text-gray-400">
                Your subscription renews monthly. Keep your payment method active to maintain access.
              </p>
            </div>

            <div className="glass-card rounded-2xl p-6">
              <div className="mb-3 text-3xl">🛡️</div>
              <h3 className="font-semibold text-white">Risk Management</h3>
              <p className="mt-1 text-sm text-gray-400">
                Always follow the stop-loss levels. Never risk more than you can afford to lose.
              </p>
            </div>
          </div>

          {/* Quick links */}
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/discord/connect"
              className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-gray-300 transition-all hover:border-[#5865F2]/30 hover:bg-[#5865F2]/10 hover:text-[#5865F2]"
            >
              Reconnect Discord
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-gray-300 transition-all hover:border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-300"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
