// Builds an absolute app URL, tolerating a NEXT_PUBLIC_APP_URL that has (or
// lacks) a trailing slash. Without this, `${NEXT_PUBLIC_APP_URL}/api/...` can
// produce a double slash (e.g. https://site.club//api/...) when the env value
// ends in `/`, which breaks Cashfree return URLs and Discord redirects.
const RAW_BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://www.hustlershive.club';

export const APP_URL = RAW_BASE.replace(/\/+$/, '');

export function appUrl(path = ''): string {
  if (!path) return APP_URL;
  return `${APP_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}
