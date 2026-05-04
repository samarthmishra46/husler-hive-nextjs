'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function ConnectContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const [discordDone, setDiscordDone] = useState(false);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === 'DISCORD_CONNECTED') setDiscordDone(true);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  function openDiscordPopup() {
    window.open('/api/auth/discord?popup=1', 'discord_oauth', 'width=520,height=700,scrollbars=yes,resizable=yes');
  }

  return (
    <div className="landing-section" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '100px' }}>
      <div style={{ maxWidth: '520px', width: '100%', textAlign: 'center' }}>
        {/* Discord icon */}
        <div style={{ margin: '0 auto 24px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(88,101,242,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg style={{ width: '40px', height: '40px', color: '#5865F2' }} viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286z" />
          </svg>
        </div>

        <h1 className="section-title">Connect Your <span className="hl">Discord</span></h1>
        <p className="section-body" style={{ margin: '0 auto' }}>
          Link your Discord account to get access to our private trading signals channel.
        </p>

        {error && (
          <div className="subscribe-error" style={{ marginTop: '16px', textAlign: 'left' }}>
            {error === 'no_code' && 'Authorization was cancelled. Please try again.'}
            {error === 'no_subscription' && 'No active subscription found. Please subscribe first.'}
            {error === 'callback_failed' && 'Something went wrong. Please try again.'}
          </div>
        )}

        <div style={{ marginTop: '32px' }}>
          {/* Instructions */}
          <div className="amenity-card" style={{ textAlign: 'left', marginBottom: '20px', padding: '24px' }}>
            <h4 className="amenity-title" style={{ marginBottom: '12px' }}>Before you connect:</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li style={{ display: 'flex', gap: '10px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <span style={{ color: 'var(--purple)', fontWeight: 700 }}>1.</span>
                Make sure you have an active subscription
              </li>
              <li style={{ display: 'flex', gap: '10px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <span style={{ color: 'var(--purple)', fontWeight: 700 }}>2.</span>
                Use the Discord account linked to your registered mobile number
              </li>
              <li style={{ display: 'flex', gap: '10px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <span style={{ color: 'var(--purple)', fontWeight: 700 }}>3.</span>
                You&apos;ll be automatically added to the private signals channel
              </li>
            </ul>
          </div>

          {discordDone ? (
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
              <a href="/dashboard" style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px', borderRadius: '10px', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', padding: '10px 20px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--purple)', textDecoration: 'none' }}>
                Go to Dashboard →
              </a>
            </div>
          ) : (
            <>
              <button
                onClick={openDiscordPopup}
                style={{ display: 'inline-flex', width: '100%', alignItems: 'center', justifyContent: 'center', gap: '12px', borderRadius: '12px', background: '#5865F2', padding: '14px 24px', fontSize: '1rem', fontWeight: 600, color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 8px 24px rgba(88,101,242,0.25)', transition: 'all 0.2s' }}
              >
                <svg style={{ width: '24px', height: '24px' }} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286z" />
                </svg>
                Sign in with Discord
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
                  Opens in a new tab — come back here after creating your account and click &quot;Sign in with Discord&quot; above.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DiscordConnectPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', minHeight: '80vh', alignItems: 'center', justifyContent: 'center' }}>
          <div className="h-10 w-10 animate-spin rounded-full border-4" style={{ borderColor: '#5865F2', borderTopColor: 'transparent' }} />
        </div>
      }
    >
      <ConnectContent />
    </Suspense>
  );
}
