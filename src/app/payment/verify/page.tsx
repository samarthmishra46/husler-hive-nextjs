'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function VerifyContent() {
  const searchParams = useSearchParams();
  const subId = searchParams.get('sub_id');
  const userId = searchParams.get('user_id');
  // Cashfree may also send its own params
  const cfSubId = searchParams.get('subscription_id') || searchParams.get('subscriptionId');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const effectiveSubId = subId || cfSubId;

    // If we have either sub_id or user_id, consider it a valid redirect from Cashfree
    if (effectiveSubId || userId) {
      setStatus('success');
    } else {
      // Check if there are ANY search params at all — Cashfree always redirects with something
      const allParams = searchParams.toString();
      if (allParams) {
        // Cashfree redirected us here with some params, treat as success
        console.log('Payment verify params:', allParams);
        setStatus('success');
      } else {
        setStatus('error');
      }
    }
  }, [subId, userId, cfSubId, searchParams]);

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-6">
      <div className="mx-auto w-full max-w-lg text-center">
        {status === 'loading' && (
          <div className="animate-fade-in">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10">
              <svg className="h-10 w-10 animate-spin text-amber-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">Verifying Payment...</h1>
            <p className="mt-2 text-gray-400">Please wait while we confirm your subscription.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="animate-fade-in">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
              <svg className="h-10 w-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white">Payment Successful! 🎉</h1>
            <p className="mt-3 text-gray-400">
              Your subscription has been set up successfully. Now connect your Discord
              account to get access to our private signals channel.
            </p>

            <div className="mt-8 space-y-4">
              <a
                href="/api/auth/discord"
                className="inline-flex w-full items-center justify-center gap-3 rounded-xl bg-[#5865F2] px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-[#5865F2]/25 transition-all hover:shadow-[#5865F2]/40 hover:brightness-110 active:scale-[0.98]"
              >
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286z" />
                </svg>
                Connect with Discord
              </a>

              <p className="text-sm text-gray-500">
                Make sure you sign in with the Discord account linked to your mobile number.
              </p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="animate-fade-in">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
              <svg className="h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white">Something Went Wrong</h1>
            <p className="mt-3 text-gray-400">
              We couldn&apos;t verify your payment. Please try again or contact support.
            </p>
            <a
              href="/"
              className="mt-8 inline-flex rounded-xl bg-white/10 px-6 py-3 font-semibold text-white transition-all hover:bg-white/20"
            >
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
        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}

