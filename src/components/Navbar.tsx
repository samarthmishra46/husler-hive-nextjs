'use client';

import Link from 'next/link';

export default function Navbar() {
  return (
    <nav>
      <Link href="/#hero" className="nav-logo">Hustler&apos;s Hive</Link>
      <ul className="nav-links">
        <li><Link href="/#how">How It Works</Link></li>
        <li><Link href="/#features">What You Get</Link></li>
        <li><Link href="/#testimonials">Reviews</Link></li>
        <li><Link href="/#pricing">Pricing</Link></li>
        <li><Link href="/#faq">FAQ</Link></li>
      </ul>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link href="/admin" className="nav-admin">Admin</Link>
        <Link href="/#pricing" className="nav-cta">Join Free Trial →</Link>
      </div>
    </nav>
  );
}
