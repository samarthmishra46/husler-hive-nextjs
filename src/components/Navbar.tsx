'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  // Checkout pages are intentionally minimal — no global chrome.
  if (pathname.startsWith('/checkout')) return null;

  return (
    <nav>
      <Link href="/" className="nav-logo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Hustler's Hive" />
      </Link>
      <ul className="nav-links">
        <li><Link href="/#plans">Plans</Link></li>
      </ul>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link href="/checkout/foundation-1m" className="nav-cta">
          Join Free Trial →
        </Link>
      </div>
    </nav>
  );
}
