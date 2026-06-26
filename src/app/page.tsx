'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PLAN_LIST, isPlanKey } from '@/lib/plans';
import type { PlanDef } from '@/lib/plans';

const recurringPlans = PLAN_LIST.filter((p) => p.billing === 'recurring');
const oneTimePlans = PLAN_LIST.filter((p) => p.billing === 'onetime');

function PlanCard({ plan }: { plan: PlanDef }) {
  return (
    <div className={`price-card${plan.badge ? ' price-card-featured' : ''}`}>
      {plan.badge && <div className="pricing-badge">{plan.badge}</div>}
      <div className="price-card-name">{plan.name}</div>
      <div className="price-card-amount">{plan.priceLabel}</div>
      <div className="price-card-period">{plan.period}</div>
      <ul className="price-card-features">
        {plan.features.map((f, i) => (
          <li key={i}><span className="feat-dot">✓</span> {f}</li>
        ))}
      </ul>
      <Link href={`/checkout/${plan.key}`} className="btn-primary price-card-btn">
        {plan.billing === 'recurring' ? 'Subscribe' : 'Buy Now'}
      </Link>
    </div>
  );
}

export default function Home() {
  const router = useRouter();

  // Deep links (?plan=<key> from the Framer pricing buttons) now go to a
  // dedicated focused checkout page. Redirect so existing links keep working.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const planParam = new URLSearchParams(window.location.search).get('plan');
    if (planParam && isPlanKey(planParam)) {
      router.replace(`/checkout/${planParam}`);
    }
  }, [router]);

  return (
    <main>
      {/* HERO */}
      <section className="landing-section hero-block" style={{ paddingTop: '140px', paddingBottom: '56px', textAlign: 'center' }}>
        <p className="section-eyebrow">Membership</p>
        <h1 className="section-title" style={{ maxWidth: '820px', margin: '0 auto' }}>
          Choose Your <span className="hl">Plan</span>
        </h1>
        <p className="section-body" style={{ margin: '16px auto 0' }}>
          Trade alongside mentors in the live 7-8 PM session. Pick the plan that fits — a recurring membership or lifetime access.
        </p>
      </section>

      {/* RECURRING PLANS */}
      <section id="plans" className="landing-section" style={{ paddingTop: '24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <p className="section-eyebrow">Memberships</p>
          <h2 className="section-title">Recurring Plans</h2>
          <p className="section-body" style={{ margin: '0 auto' }}>
            Billed up front. Cancel anytime from your UPI/Bank app.
          </p>
        </div>
        <div className="pricing-grid">
          {recurringPlans.map((plan) => (
            <PlanCard key={plan.key} plan={plan} />
          ))}
        </div>
      </section>

      <div className="divider"></div>

      {/* ONE-TIME PLANS */}
      <section className="landing-section">
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <p className="section-eyebrow">One-time</p>
          <h2 className="section-title">Lifetime <span className="hl">Access</span></h2>
          <p className="section-body" style={{ margin: '0 auto' }}>
            Pay once, no recurring charges, no expiry. Paid-in-advance access that never lapses.
          </p>
        </div>
        <div className="pricing-grid">
          {oneTimePlans.map((plan) => (
            <PlanCard key={plan.key} plan={plan} />
          ))}
        </div>
      </section>
    </main>
  );
}
