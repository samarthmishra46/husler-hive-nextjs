import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div className="footer-brand">
          <Link href="/#hero" className="footer-logo">Hustler's Hive</Link>
          <p>Co-Working Space for Builders.<br />Arumbakkam, Chennai.</p>
        </div>
        <div className="footer-col">
          <h5>Navigate</h5>
          <ul>
            <li><Link href="/#about">About</Link></li>
            <li><Link href="/#space">The Space</Link></li>
            <li><Link href="/#amenities">Amenities</Link></li>
            <li><Link href="/#pricing">Pricing</Link></li>
            <li><Link href="/#faq">FAQ</Link></li>
          </ul>
        </div>
        <div className="footer-col">
          <h5>Legal</h5>
          <ul>
            <li><Link href="/privacy">Privacy Policy</Link></li>
            <li><Link href="/terms">Terms & Conditions</Link></li>
            <li><Link href="/refund">Refund Policy</Link></li>
          </ul>
        </div>
        <div className="footer-col">
          <h5>Contact</h5>
          <ul>
            <li><a href="mailto:hustlershive@protonmail.com">hustlershive@protonmail.com</a></li>
            <li><a href="tel:+916380306821">+91 6380306821</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} Hustler's Hive. All rights reserved.</p>
        <p>
          <Link href="/privacy">Privacy Policy</Link> &nbsp;·&nbsp;{' '}
          <Link href="/terms">Terms & Conditions</Link> &nbsp;·&nbsp;{' '}
          <Link href="/refund">Refund Policy</Link>
        </p>
      </div>
    </footer>
  );
}
