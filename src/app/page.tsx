'use client';

import { useEffect, useState } from 'react';
import SubscribeForm from '@/components/SubscribeForm';
import { PLAN_LIST, isPlanKey } from '@/lib/plans';
import type { PlanKey, PlanDef } from '@/lib/plans';

const DEFAULT_PLAN: PlanKey = 'foundation-1m';

const recurringPlans = PLAN_LIST.filter((p) => p.billing === 'recurring');
const oneTimePlans = PLAN_LIST.filter((p) => p.billing === 'onetime');

function PlanCard({ plan, onSelect, highlighted }: { plan: PlanDef; onSelect: (k: PlanKey) => void; highlighted: boolean }) {
  return (
    <div className={`price-card${plan.badge ? ' price-card-featured' : ''}`} style={highlighted ? { outline: '2px solid var(--purple)', outlineOffset: '2px' } : undefined}>
      {plan.badge && <div className="pricing-badge">{plan.badge}</div>}
      <div className="price-card-name">{plan.name}</div>
      <div className="price-card-amount">{plan.priceLabel}</div>
      <div className="price-card-period">{plan.period}</div>
      <ul className="price-card-features">
        {plan.features.map((f, i) => (
          <li key={i}><span className="feat-dot">✓</span> {f}</li>
        ))}
      </ul>
      <button onClick={() => onSelect(plan.key)} className="btn-primary price-card-btn">
        {plan.billing === 'recurring' ? 'Start Free Trial' : 'Buy Now'}
      </button>
    </div>
  );
}

export default function Home() {
  const [showForm, setShowForm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>(DEFAULT_PLAN);

  function openPlan(key: PlanKey) {
    setSelectedPlan(key);
    setShowForm(true);
  }

  // Deep-link support (?plan=<key> from the Framer pricing buttons), the navbar
  // `open-subscribe` event, and the cross-route `?signup=1` fallback.
  useEffect(() => {
    function onOpen() { setShowForm(true); }
    window.addEventListener('open-subscribe', onOpen);

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const planParam = params.get('plan');
      const wantsSignup = params.get('signup') === '1';

      if (planParam && isPlanKey(planParam)) {
        setSelectedPlan(planParam);
        setShowForm(true);
      } else if (wantsSignup) {
        setShowForm(true);
      }

      // Strip params so a refresh doesn't keep re-opening the modal.
      if (planParam || wantsSignup) {
        const url = new URL(window.location.href);
        url.searchParams.delete('plan');
        url.searchParams.delete('signup');
        window.history.replaceState({}, '', url.toString());
      }
    }

    return () => window.removeEventListener('open-subscribe', onOpen);
  }, []);

  return (
    <main>
      {/* HERO */}
      <section className="landing-section hero-block" style={{ paddingTop: '140px', paddingBottom: '56px', textAlign: 'center' }}>
        <p className="section-eyebrow">Membership</p>
        <h1 className="section-title" style={{ maxWidth: '820px', margin: '0 auto' }}>
          Choose Your <span className="hl">Plan</span>
        </h1>
        <p className="section-body" style={{ margin: '16px auto 0' }}>
          Trade alongside mentors in the live 7-8 PM session. Pick the plan that fits — start with a 7-day free trial, or get lifetime access.
        </p>
      </section>

      {/* RECURRING PLANS */}
      <section id="plans" className="landing-section" style={{ paddingTop: '24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <p className="section-eyebrow">Memberships</p>
          <h2 className="section-title">Recurring Plans</h2>
          <p className="section-body" style={{ margin: '0 auto' }}>
            7-day free trial included. Cancel anytime from your UPI/Bank app.
          </p>
        </div>
        <div className="pricing-grid">
          {recurringPlans.map((plan) => (
            <PlanCard key={plan.key} plan={plan} onSelect={openPlan} highlighted={selectedPlan === plan.key && showForm} />
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
            <PlanCard key={plan.key} plan={plan} onSelect={openPlan} highlighted={selectedPlan === plan.key && showForm} />
          ))}
        </div>
      </section>

      {showForm && (
        <SubscribeForm plan={selectedPlan} onClose={() => setShowForm(false)} />
      )}
    </main>
  );
}
