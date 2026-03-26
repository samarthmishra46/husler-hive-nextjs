'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function DashboardContent() {
  const searchParams = useSearchParams();
  const discordStatus = searchParams.get('discord');

  return (
    <div className="landing-section" style={{ minHeight: '80vh', paddingTop: '100px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Success banner */}
        {discordStatus === 'connected' && (
          <div style={{ marginBottom: '32px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '16px', padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg style={{ width: '20px', height: '20px', color: '#10b981' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 style={{ fontWeight: 700, color: '#10b981', fontSize: '0.95rem' }}>Discord Connected!</h3>
                <p style={{ fontSize: '0.82rem', color: '#6ee7b7', marginTop: '2px' }}>
                  You&apos;ve been added to the private signals channel. Check your Discord!
                </p>
              </div>
            </div>
          </div>
        )}

        {discordStatus === 'reconnected' && (
          <div style={{ marginBottom: '32px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '16px', padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg style={{ width: '20px', height: '20px', color: '#3b82f6' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div>
                <h3 style={{ fontWeight: 700, color: '#3b82f6', fontSize: '0.95rem' }}>Discord Reconnected</h3>
                <p style={{ fontSize: '0.82rem', color: '#93c5fd', marginTop: '2px' }}>Your Discord account has been updated.</p>
              </div>
            </div>
          </div>
        )}

        {/* Welcome */}
        <p className="section-eyebrow">Dashboard</p>
        <h1 className="section-title">Welcome to <span className="hl">Hustlers Hive!</span> 🐝</h1>
        <p className="section-body">You&apos;re all set. Here&apos;s what you need to know.</p>

        {/* Info cards */}
        <div className="amenities-grid" style={{ marginTop: '32px' }}>
          <div className="amenity-card">
            <span className="amenity-icon">📊</span>
            <h4 className="amenity-title">Trading Signals</h4>
            <p className="amenity-desc">Real-time signals are posted in the private Discord channel. Keep notifications on!</p>
          </div>

          <div className="amenity-card">
            <span className="amenity-icon">⏰</span>
            <h4 className="amenity-title">Market Hours</h4>
            <p className="amenity-desc">Live sessions run 7-8 PM IST (NY Session). All sessions are recorded.</p>
          </div>

          <div className="amenity-card">
            <span className="amenity-icon">💳</span>
            <h4 className="amenity-title">Subscription</h4>
            <p className="amenity-desc">Your subscription renews monthly. Keep your payment method active to maintain access.</p>
          </div>

          <div className="amenity-card">
            <span className="amenity-icon">🛡️</span>
            <h4 className="amenity-title">Risk Management</h4>
            <p className="amenity-desc">Always follow the stop-loss levels. Never risk more than you can afford to lose.</p>
          </div>
        </div>

        {/* Quick links */}
        <div style={{ marginTop: '32px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <a href="/discord/connect" className="btn-outline">
            Reconnect Discord
          </a>
          <a href="/" className="btn-outline">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', minHeight: '80vh', alignItems: 'center', justifyContent: 'center' }}>
          <div className="h-10 w-10 animate-spin rounded-full border-4" style={{ borderColor: 'var(--purple)', borderTopColor: 'transparent' }} />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
