'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function VerifyContent() {
  const searchParams = useSearchParams();
  const subId = searchParams.get('sub_id');
  const userId = searchParams.get('user_id');
  const cfSubId = searchParams.get('subscription_id') || searchParams.get('subscriptionId');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const effectiveSubId = subId || cfSubId;
    if (effectiveSubId || userId) {
      setStatus('success');
    } else {
      const allParams = searchParams.toString();
      if (allParams) {
        console.log('Payment verify params:', allParams);
        setStatus('success');
      } else {
        setStatus('error');
      }
    }
  }, [subId, userId, cfSubId, searchParams]);

  return (
    <div className="landing-section" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '100px' }}>
      <div style={{ maxWidth: '520px', width: '100%', textAlign: 'center' }}>
        {status === 'loading' && (
          <div>
            <div style={{ margin: '0 auto 24px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="h-10 w-10 animate-spin rounded-full border-4" style={{ borderColor: 'var(--purple)', borderTopColor: 'transparent' }} />
            </div>
            <h1 className="section-title">Verifying Payment...</h1>
            <p className="section-body" style={{ margin: '0 auto' }}>Please wait while we confirm your subscription.</p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div style={{ margin: '0 auto 24px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg style={{ width: '40px', height: '40px', color: '#10b981' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="section-title">Payment <span className="hl">Successful!</span> 🎉</h1>
            <p className="section-body" style={{ margin: '0 auto' }}>
              Your subscription has been set up successfully. Now connect your Discord
              account to get access to our private signals channel.
            </p>

            <div style={{ marginTop: '32px' }}>
              <a
                href="/api/auth/discord"
                style={{ display: 'inline-flex', width: '100%', alignItems: 'center', justifyContent: 'center', gap: '12px', borderRadius: '12px', background: '#5865F2', padding: '14px 24px', fontSize: '1rem', fontWeight: 600, color: '#fff', textDecoration: 'none', boxShadow: '0 8px 24px rgba(88,101,242,0.25)', transition: 'all 0.2s' }}
              >
                <svg style={{ width: '24px', height: '24px' }} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286z" />
                </svg>
                Connect with Discord
              </a>

              <p style={{ marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-light)' }}>
                Make sure you sign in with the Discord account linked to your mobile number.
              </p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div style={{ margin: '0 auto 24px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg style={{ width: '40px', height: '40px', color: '#ef4444' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="section-title">Something Went Wrong</h1>
            <p className="section-body" style={{ margin: '0 auto' }}>
              We couldn&apos;t verify your payment. Please try again or contact support.
            </p>
            <a href="/" className="btn-outline" style={{ marginTop: '28px', display: 'inline-flex' }}>
              ← Back to Home
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PaymentVerifyPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', minHeight: '80vh', alignItems: 'center', justifyContent: 'center' }}>
          <div className="h-10 w-10 animate-spin rounded-full border-4" style={{ borderColor: 'var(--purple)', borderTopColor: 'transparent' }} />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
