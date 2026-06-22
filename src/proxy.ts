import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Origins allowed to call the public homepage endpoints from the browser.
// Set FRAMER_ALLOWED_ORIGINS in env as a comma-separated list, e.g.
//   FRAMER_ALLOWED_ORIGINS=https://yoursite.com,https://yoursite.framer.website
// The localhost entries keep Framer's local preview + Next dev working.
const allowedOrigins = (process.env.FRAMER_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)
  .concat(['http://localhost:3000']);

const corsOptions = {
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function proxy(request: NextRequest) {
  const origin = request.headers.get('origin') ?? '';
  const isAllowedOrigin = allowedOrigins.includes(origin);

  // Preflight
  if (request.method === 'OPTIONS') {
    return NextResponse.json(
      {},
      {
        headers: {
          ...(isAllowedOrigin && { 'Access-Control-Allow-Origin': origin }),
          ...corsOptions,
        },
      }
    );
  }

  // Actual request
  const response = NextResponse.next();
  if (isAllowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Vary', 'Origin');
  }
  Object.entries(corsOptions).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

// Only the two public endpoints Framer calls. Everything else (dashboard,
// admin, webhooks, payment/discord) stays same-origin and is untouched.
export const config = {
  matcher: ['/api/check-user', '/api/subscribe'],
};
