'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function VerifyContent() {
  const searchParams = useSearchParams();
  const subId = searchParams.get('sub_id');
  const cfSubId = searchParams.get('subscription_id') || searchParams.get('subscriptionId');
  const orderId = searchParams.get('order_id');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const [discordDone, setDiscordDone] = useState(false);

  // userId is resolved by polling /api/payment/status — the user record is created
  // by the Cashfree webhook only after payment succeeds, so it may not exist for a
  // few seconds after redirect.
  const discordAuthUrl = resolvedUserId
    ? `/api/auth/discord?user_id=${resolvedUserId}&popup=1`
    : '/api/auth/discord?popup=1';

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === 'DISCORD_CONNECTED') {
        setDiscordDone(true);
      } else if (e.data?.type === 'DISCORD_ERROR' && e.data?.status === 'already-linked') {
        alert('This subscription is already linked to another Discord account. If this is wrong, contact support.');
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  function openDiscordPopup() {
    window.open(
      discordAuthUrl,
      'discord_oauth',
      'width=520,height=700,scrollbars=yes,resizable=yes'
    );
  }

  useEffect(() => {
    const effectiveSubId = subId || cfSubId;
    // One-time orders verify by order_id; subscriptions by sub_id.
    const statusQuery = orderId
      ? `order_id=${encodeURIComponent(orderId)}`
      : effectiveSubId
        ? `sub_id=${encodeURIComponent(effectiveSubId)}`
        : '';

    if (!statusQuery) {
      setStatus(searchParams.toString() ? 'success' : 'error');
      return;
    }

    // Poll the status endpoint until the webhook has materialized the user.
    // Cap at ~90s — most webhooks land in 2-5s, but bank approvals can take longer.
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 45; // 45 × 2s = 90s

    async function poll() {
      while (!cancelled && attempts < maxAttempts) {
        attempts++;
        try {
          const res = await fetch(`/api/payment/status?${statusQuery}`);
          const data = await res.json();
          if (data.ready && data.userId) {
            if (!cancelled) {
              setResolvedUserId(data.userId);
              setStatus('success');
              // If Discord is already linked (e.g. user refreshed this page after
              // connecting), skip the Connect step entirely — one sub = one Discord.
              if (data.discordConnected) setDiscordDone(true);
            }
            return;
          }
        } catch (e) {
          console.error('Status poll failed:', e);
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (!cancelled) setStatus('error');
    }

    poll();
    return () => { cancelled = true; };
  }, [subId, cfSubId, orderId, searchParams]);

  return (
    <div className="landing-section" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '100px' }}>
      <div style={{ maxWidth: '520px', width: '100%', textAlign: 'center' }}>
        {status === 'loading' && (
          <div>
            <div style={{ margin: '0 auto 24px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="h-10 w-10 animate-spin rounded-full border-4" style={{ borderColor: 'var(--purple)', borderTopColor: 'transparent' }} />
            </div>
            <h1 className="section-title">Confirming Payment...</h1>
            <p className="section-body" style={{ margin: '0 auto' }}>
              We&apos;re waiting for your bank to confirm the authorization. This usually takes a few seconds — please don&apos;t close this page.
            </p>
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
              {discordDone ? (
                /* ── Connected state ── */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg style={{ width: '32px', height: '32px', color: '#10b981' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p style={{ fontWeight: 700, fontSize: '1rem', color: '#059669', margin: 0 }}>Discord Connected!</p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                    You now have access to the private signals channel.
                  </p>
                  
                </div>
              ) : (
                /* ── Connect state ── */
                <>
                  <button
                    onClick={openDiscordPopup}
                    style={{ display: 'inline-flex', width: '100%', alignItems: 'center', justifyContent: 'center', gap: '12px', borderRadius: '12px', background: '#5865F2', padding: '14px 24px', fontSize: '1rem', fontWeight: 600, color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 8px 24px rgba(88,101,242,0.25)', transition: 'all 0.2s' }}
                  >
                    <svg style={{ width: '24px', height: '24px' }} viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286z" />
                    </svg>
                    Connect with Discord
                  </button>

                  <p style={{ marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-light)' }}>
                    A small window will open — sign in and it will close automatically.
                  </p>

                  <div style={{ marginTop: '20px', padding: '16px', borderRadius: '10px', background: 'rgba(88,101,242,0.07)', border: '1px solid rgba(88,101,242,0.18)' }}>
                    <p style={{ margin: '0 0 10px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      Don&apos;t have a Discord account?
                    </p>
                    <a
                      href="https://discord.com/register"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', borderRadius: '8px', border: '1.5px solid #5865F2', padding: '10px 20px', fontSize: '0.85rem', fontWeight: 600, color: '#5865F2', textDecoration: 'none', background: 'transparent' }}
                    >
                      <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286z" />
                      </svg>
                      Create a free Discord account ↗
                    </a>
                    <p style={{ margin: '10px 0 0', fontSize: '0.75rem', color: 'var(--text-light)' }}>
                      Opens in a new tab — come back here after creating your account and click &quot;Connect with Discord&quot; above.
                    </p>
                  </div>
                </>
              )}
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
