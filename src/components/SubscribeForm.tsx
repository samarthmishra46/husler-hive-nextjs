'use client';

import { useState, useEffect } from 'react';
import type { PlanType } from '@/app/page';

declare global {
  interface Window {
    Cashfree?: (config: { mode: string }) => {
      subscriptionsCheckout: (options: {
        subsSessionId: string;
        redirectTarget?: string;
      }) => Promise<{ error?: { message: string } }>;
    };
  }
}

const PLAN_DETAILS: Record<PlanType, { name: string; price: string; period: string }> = {
  monthly: { name: 'Monthly Membership', price: '₹4,999', period: '/month' },
  quarterly: { name: '3-Month Bundle', price: '₹12,997', period: '(save 15%)' },
};

interface SubscribeFormProps {
  plan: PlanType;
  onClose: () => void;
}

export default function SubscribeForm({ plan, onClose }: SubscribeFormProps) {
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sdkReady, setSdkReady] = useState(false);
  const [showTrialExpiredPopup, setShowTrialExpiredPopup] = useState(false);
  const [eligibleForTrial, setEligibleForTrial] = useState(true);

  const planInfo = PLAN_DETAILS[plan];

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate
    if (!email || !mobile) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email');
      setLoading(false);
      return;
    }

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError('Please enter a valid 10-digit Indian mobile number');
      setLoading(false);
      return;
    }

    try {
      // First check if user is eligible for trial
      const checkRes = await fetch('/api/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const checkData = await checkRes.json();

      if (!checkData.eligibleForTrial) {
        // User not eligible for trial - show popup
        setEligibleForTrial(false);
        setShowTrialExpiredPopup(true);
        setLoading(false);
        return;
      }

      // User is eligible for trial, proceed with subscription
      await proceedToPayment();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      );
      setLoading(false);
    }
  };

  const proceedToPayment = async () => {
    setLoading(true);
    setShowTrialExpiredPopup(false);
    
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, mobile, plan }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      if (data.subscriptionSessionId && sdkReady && window.Cashfree) {
        // Initialize Cashfree SDK
        const cashfree = window.Cashfree({
          mode: 'production'
        });

        // Open subscription checkout
        const result = await cashfree.subscriptionsCheckout({
          subsSessionId: data.subscriptionSessionId,
          redirectTarget: '_blank'
        });

        if (result.error) {
          setError(result.error.message || 'Payment failed. Please try again.');
        }
      } else if (data.paymentLink) {
        // Fallback to direct redirect
        window.location.href = data.paymentLink;
      } else {
        setError('Failed to initialize payment. Please try again.');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="subscribe-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      {/* Trial Expired Popup */}
      {showTrialExpiredPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏰</div>
            <h3 style={{ 
              fontSize: '1.4rem', 
              fontWeight: 700, 
              color: '#1a1a2e', 
              marginBottom: '12px' 
            }}>
              Your Free Trial Has Expired
            </h3>
            <p style={{ 
              color: '#666666', 
              marginBottom: '24px',
              fontSize: '0.95rem',
              lineHeight: 1.5
            }}>
              You&apos;ve already used your 7-day free trial. You&apos;ll be charged {planInfo.price} immediately upon subscription.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowTrialExpiredPopup(false)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0',
                  background: '#f5f5f5',
                  color: '#333333',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                onClick={proceedToPayment}
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {loading ? 'Processing...' : 'Continue to Payment →'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="subscribe-modal">
        {/* Close button */}
        <button onClick={onClose} className="subscribe-close">✕</button>

        <h2 className="subscribe-heading">Get Started</h2>
        <p className="subscribe-subheading">
          Enter your details to start your membership
        </p>

        {/* Selected Plan Info */}
        <div style={{ 
          background: 'rgba(124,58,237,0.1)', 
          border: '1px solid rgba(124,58,237,0.2)', 
          borderRadius: '12px', 
          padding: '16px', 
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontWeight: 600, color: 'var(--purple)', fontSize: '0.9rem' }}>{planInfo.name}</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>
            {planInfo.price} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>{planInfo.period}</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '4px' }}>🎉 7-day free trial included</div>
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
              'Continue to Payment →'
            )}
          </button>

          <p className="subscribe-terms">
            By subscribing, you agree to our Terms & Privacy Policy
          </p>
        </form>
      </div>
    </div>
  );
}
