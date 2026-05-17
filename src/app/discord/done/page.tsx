'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

function DoneContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get('discord'); // 'connected' | 'reconnected' | 'already-linked'
  const isError = status === 'already-linked';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Notify the opener tab — success or error — then close this tab.
    if (window.opener && !window.opener.closed) {
      const type = isError ? 'DISCORD_ERROR' : 'DISCORD_CONNECTED';
      window.opener.postMessage({ type, status }, window.opener.location.origin);
    }

    // Give the message a moment to arrive, then close
    const timer = setTimeout(() => {
      window.close();
      // If window.close() is blocked (some browsers require user gesture), redirect to dashboard
      setTimeout(() => {
        window.location.href = '/dashboard?discord=' + (status || 'connected');
      }, 800);
    }, isError ? 2500 : 1200);

    return () => clearTimeout(timer);
  }, [status, isError]);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', flexDirection: 'column', gap: '16px', textAlign: 'center', padding: '24px',
    }}>
      {/* Animated success circle */}
      <div style={{
        width: '80px', height: '80px', borderRadius: '50%',
        background: 'rgba(88,101,242,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'pop 0.4s ease',
      }}>
        <svg style={{ width: '40px', height: '40px', color: '#5865F2' }} viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286z" />
        </svg>
      </div>

      <div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>
          {isError
            ? 'Discord Already Linked'
            : `Discord ${status === 'reconnected' ? 'Reconnected' : 'Connected'}!`}
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
          {isError
            ? 'This subscription is already linked to another Discord account. Contact support if this is wrong.'
            : 'You now have access to the private signals channel. This window will close automatically.'}
        </p>
      </div>

      <style>{`
        @keyframes pop {
          0% { transform: scale(0.6); opacity: 0; }
          80% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default function DiscordDonePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="h-10 w-10 animate-spin rounded-full border-4" style={{ borderColor: '#5865F2', borderTopColor: 'transparent' }} />
    </div>}>
      <DoneContent />
    </Suspense>
  );
}
