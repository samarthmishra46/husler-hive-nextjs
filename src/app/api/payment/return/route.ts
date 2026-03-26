import { NextRequest, NextResponse } from 'next/server';

// Cashfree redirects back via POST after payment/authorization.
// This route catches the POST and redirects (GET) to the verify page.
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const subId = url.searchParams.get('sub_id') || '';
  const userId = url.searchParams.get('user_id') || '';

  // Also try to extract from the POST body (Cashfree may send form data)
  let bodySubId = '';
  let bodyUserId = '';
  try {
    const formData = await request.formData();
    bodySubId = (formData.get('subscriptionId') || formData.get('subscription_id') || '') as string;
    bodyUserId = (formData.get('user_id') || '') as string;
  } catch {
    // Body may not be form data, ignore
  }

  const effectiveSubId = subId || bodySubId;
  const effectiveUserId = userId || bodyUserId;

  const redirectUrl = new URL('/payment/verify', url.origin);
  if (effectiveSubId) redirectUrl.searchParams.set('sub_id', effectiveSubId);
  if (effectiveUserId) redirectUrl.searchParams.set('user_id', effectiveUserId);

  return NextResponse.redirect(redirectUrl.toString(), 303); // 303 = redirect as GET
}

// Also handle GET in case Cashfree uses GET redirect
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const redirectUrl = new URL('/payment/verify', url.origin);

  // Forward all query params
  url.searchParams.forEach((value, key) => {
    redirectUrl.searchParams.set(key, value);
  });

  return NextResponse.redirect(redirectUrl.toString(), 303);
}
