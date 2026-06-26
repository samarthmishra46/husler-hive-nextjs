// ─── Single source of truth for every purchasable product ───────────────
//
// Both the public subscription page and the server-side payment routes read
// from here. Never trust an amount sent by the client — always look it up by
// `key` in this catalog on the server before creating a Cashfree session.

export type PlanKey =
  | 'foundation-1m'
  | 'foundation-3m'
  | 'tradefloor-1m'
  | 'tradefloor-3m'
  | 'elite-59999'
  | 'elite-64999'
  | 'link1'
  | 'link2'
  | 'link3';

export type BillingType = 'recurring' | 'onetime';

export interface PlanDef {
  key: PlanKey;
  name: string;
  amount: number; // in INR rupees
  billing: BillingType;
  // recurring only — Cashfree subscription interval
  intervalType?: 'MONTH';
  intervals?: number;
  /** Short label shown next to the price, e.g. "/month", "one-time". */
  period: string;
  /** Human price label, e.g. "₹14,999". */
  priceLabel: string;
  features: string[];
  badge?: string;
}

function inr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export const PLANS: Record<PlanKey, PlanDef> = {
  'foundation-1m': {
    key: 'foundation-1m',
    name: 'Foundation (1 Month)',
    amount: 4999,
    billing: 'recurring',
    intervalType: 'MONTH',
    intervals: 1,
    period: '/month',
    priceLabel: inr(4999),
    badge: 'Most Popular',
    features: [
      'Private Discord Access',
      'Recorded Sessions Library',
      '24/7 Mentor Support',
      'Trade Reviews',
    ],
  },
  'foundation-3m': {
    key: 'foundation-3m',
    name: 'Foundation (3 Months)',
    amount: 12999,
    billing: 'recurring',
    intervalType: 'MONTH',
    intervals: 3,
    period: '/3 months',
    priceLabel: inr(12999),
    features: [
      'Private Discord Access',
      'Recorded Sessions Library',
      '24/7 Mentor Support',
      'Personal Trade Reviews',
    ],
  },
  'tradefloor-1m': {
    key: 'tradefloor-1m',
    name: 'Trade Floor Pro (1 Month)',
    amount: 14999,
    billing: 'recurring',
    intervalType: 'MONTH',
    intervals: 1,
    period: '/month',
    priceLabel: inr(14999),
    features: [
      'Everything in Foundation',
      'Live Trade Floor Access',
      'Priority Mentor Support',
      'Advanced Trade Reviews',
    ],
  },
  'tradefloor-3m': {
    key: 'tradefloor-3m',
    name: 'Trade Floor Pro (3 Months)',
    amount: 39999,
    billing: 'recurring',
    intervalType: 'MONTH',
    intervals: 3,
    period: '/3 months',
    priceLabel: inr(39999),
    features: [
      'Everything in Foundation',
      'Live Trade Floor Access',
      'Priority Mentor Support',
      'Advanced Trade Reviews',
    ],
  },
  'elite-59999': {
    key: 'elite-59999',
    name: 'Elite Mentorship',
    amount: 59999,
    billing: 'onetime',
    period: 'one-time',
    priceLabel: inr(59999),
    features: [
      'Lifetime Mentorship Access',
      'Private Discord Access',
      '1-on-1 Sessions',
      'No Recurring Charges',
    ],
  },
  'elite-64999': {
    key: 'elite-64999',
    name: 'Elite Mentorship Plus',
    amount: 64999,
    billing: 'onetime',
    period: 'one-time',
    priceLabel: inr(64999),
    features: [
      'Lifetime Mentorship Access',
      'Private Discord Access',
      'Extended 1-on-1 Sessions',
      'No Recurring Charges',
    ],
  },
  link1: {
    key: 'link1',
    name: 'Link 1',
    amount: 9999,
    billing: 'onetime',
    period: 'one-time',
    priceLabel: inr(9999),
    features: ['Private Discord Access', 'One-time Payment'],
  },
  link2: {
    key: 'link2',
    name: 'Link 2',
    amount: 24999,
    billing: 'onetime',
    period: 'one-time',
    priceLabel: inr(24999),
    features: ['Private Discord Access', 'One-time Payment'],
  },
  link3: {
    key: 'link3',
    name: 'Link 3',
    amount: 31999,
    billing: 'onetime',
    period: 'one-time',
    priceLabel: inr(31999),
    features: ['Private Discord Access', 'One-time Payment'],
  },
};

export const PLAN_LIST: PlanDef[] = Object.values(PLANS);

export function isPlanKey(value: unknown): value is PlanKey {
  return typeof value === 'string' && value in PLANS;
}

export function getPlan(key: string): PlanDef | undefined {
  return isPlanKey(key) ? PLANS[key] : undefined;
}

/** Map a recurring charge/plan amount back to its PlanKey (amounts are unique). */
export function recurringPlanKeyByAmount(amount: number): PlanKey {
  const match = PLAN_LIST.find(
    (p) => p.billing === 'recurring' && p.amount === amount
  );
  return match?.key ?? 'foundation-1m';
}
