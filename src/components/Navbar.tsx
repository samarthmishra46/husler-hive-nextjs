'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  function openSignup() {
    // On the home page the modal is already mounted — just open it. Anywhere
    // else, navigate home with ?signup=1 and page.tsx will pop it on mount.
    if (pathname === '/') {
      window.dispatchEvent(new CustomEvent('open-subscribe'));
    } else {
      router.push('/?signup=1');
    }
  }

  return (
    <nav>
      <Link href="/" className="nav-logo">Hustler&apos;s Hive</Link>
      <ul className="nav-links">
        <li><Link href="/#plans">Plans</Link></li>
      </ul>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          type="button"
          onClick={openSignup}
          className="nav-cta"
          style={{ border: 'none', cursor: 'pointer', font: 'inherit' }}
        >
          Join Free Trial →
        </button>
      </div>
    </nav>
  );
}
