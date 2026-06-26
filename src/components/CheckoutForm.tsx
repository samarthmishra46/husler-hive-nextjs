'use client';

import { useState, useEffect } from 'react';
import { PLANS } from '@/lib/plans';
import type { PlanKey } from '@/lib/plans';

declare global {
  interface Window {
    Cashfree?: (config: { mode: string }) => {
      subscriptionsCheckout: (options: {
        subsSessionId: string;
        redirectTarget?: string;
      }) => Promise<{ error?: { message: string } }>;
      checkout: (options: {
        paymentSessionId: string;
        redirectTarget?: string;
      }) => Promise<{ error?: { message: string } }>;
    };
  }
}

interface CheckoutFormProps {
  plan: PlanKey;
}

export default function CheckoutForm({ plan }: CheckoutFormProps) {
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sdkReady, setSdkReady] = useState(false);

  const planInfo = PLANS[plan];
  const isRecurring = planInfo.billing === 'recurring';

  // Load Cashfree SDK on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if ('Cashfree' in window) {
        setSdkReady(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.async = true;
      script.onload = () => {
        setSdkReady(true);
      };
      document.body.appendChild(script);
    }
  }, []);

  const validate = (): boolean => {
    if (!email || !mobile) {
      setError('Please fill in all fields');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email');
      return false;
    }
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError('Please enter a valid 10-digit Indian mobile number');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!validate()) {
      setLoading(false);
      return;
    }

    try {
      if (isRecurring) {
        // Recurring plans charge the full amount upfront — no trial.
        await proceedToSubscription();
      } else {
        // One-time products charge the full amount immediately.
        await proceedToOrder();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      );
      setLoading(false);
    }
  };

  const proceedToSubscription = async () => {
    setLoading(true);

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, mobile, plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');

      if (data.subscriptionSessionId && sdkReady && window.Cashfree) {
        const cashfree = window.Cashfree({ mode: 'production' });
        // Same-tab redirect — opening a new tab here is blocked by popup
        // blockers because it happens after an await (user gesture is spent).
        const result = await cashfree.subscriptionsCheckout({
          subsSessionId: data.subscriptionSessionId,
          redirectTarget: '_self',
        });
        if (result.error) {
          setError(result.error.message || 'Payment failed. Please try again.');
          setLoading(false);
        }
      } else if (data.paymentLink) {
        window.location.href = data.paymentLink;
      } else {
        setError('Failed to initialize payment. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      );
      setLoading(false);
    }
  };

  const proceedToOrder = async () => {
    setLoading(true);

    try {
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, mobile, plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');

      if (data.paymentSessionId && sdkReady && window.Cashfree) {
        const cashfree = window.Cashfree({ mode: 'production' });
        const result = await cashfree.checkout({
          paymentSessionId: data.paymentSessionId,
          redirectTarget: '_self',
        });
        if (result.error) {
          setError(result.error.message || 'Payment failed. Please try again.');
          setLoading(false);
        }
      } else {
        setError('Failed to initialize payment. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      );
      setLoading(false);
    }
  };

  return (
    <>
      {/* Selected Plan Info */}
      <div style={{
        background: '#161618',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <div style={{ fontWeight: 500, color: 'var(--purple-light)', fontSize: '0.9rem' }}>{planInfo.name}</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 500, color: 'var(--text)' }}>
          {planInfo.priceLabel} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>{planInfo.period}</span>
        </div>
        {isRecurring ? (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Billed {planInfo.period.replace(/^\//, 'every ')} • Cancel anytime</div>
        ) : (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>One-time payment • Lifetime access</div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="subscribe-form">
        <div className="subscribe-field">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="subscribe-field">
          <label htmlFor="mobile">Mobile Number</label>
          <div className="subscribe-mobile-wrap">
            <span className="subscribe-prefix">+91</span>
            <input
              id="mobile"
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="9876543210"
              required
            />
          </div>
        </div>

        {error && (
          <div className="subscribe-error">{error}</div>
        )}

        <button type="submit" disabled={loading} className="btn-primary subscribe-submit">
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <svg style={{ width: 20, height: 20, animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none">
                <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processing...
            </span>
          ) : (
            isRecurring ? 'Continue to Payment →' : `Pay ${planInfo.priceLabel} →`
          )}
        </button>

        <p className="subscribe-terms">
          By {isRecurring ? 'subscribing' : 'purchasing'}, you agree to our Terms &amp; Privacy Policy
        </p>
      </form>
    </>
  );
}
