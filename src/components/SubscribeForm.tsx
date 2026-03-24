'use client';

import { useState } from 'react';

interface SubscribeFormProps {
  onClose: () => void;
}

export default function SubscribeForm({ onClose }: SubscribeFormProps) {
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, mobile }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      if (data.paymentLink) {
        window.location.href = data.paymentLink;
      } else {
        setError('Failed to get payment link. Please try again.');
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
      <div className="subscribe-modal">
        {/* Close button */}
        <button onClick={onClose} className="subscribe-close">✕</button>

        <h2 className="subscribe-heading">Get Started</h2>
        <p className="subscribe-subheading">
          Enter your details to start your membership
        </p>

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
