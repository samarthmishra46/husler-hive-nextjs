import { NextRequest, NextResponse } from 'next/server';

// Cashfree redirects back via POST after payment/authorization.
// This route catches the POST and redirects (GET) to the verify page.
// We only forward sub_id — user_id no longer exists at this point (the user is
// created by the webhook on payment success, which the verify page polls for).
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const subId = url.searchParams.get('sub_id') || '';

  let bodySubId = '';
  try {
    const formData = await request.formData();
    bodySubId = (formData.get('subscriptionId') || formData.get('subscription_id') || '') as string;
  } catch {
    // Body may not be form data, ignore
  }

  const effectiveSubId = subId || bodySubId;

  const redirectUrl = new URL('/payment/verify', url.origin);
  if (effectiveSubId) redirectUrl.searchParams.set('sub_id', effectiveSubId);

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
