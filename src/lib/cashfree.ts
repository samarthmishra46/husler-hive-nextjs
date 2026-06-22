import crypto from 'crypto';
import { PLAN_LIST } from '@/lib/plans';

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID!;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY!;
const CASHFREE_ENV = process.env.CASHFREE_ENV || 'sandbox';

// New PG API endpoint
const BASE_URL =
  CASHFREE_ENV === 'production'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';

function getHeaders(): Record<string, string> {
  return {
    'x-client-id': CASHFREE_APP_ID,
    'x-client-secret': CASHFREE_SECRET_KEY,
    'x-api-version': '2025-01-01',
    'Content-Type': 'application/json',
  };
}

// Get first charge time in ISO 8601 format with IST timezone
function getFirstChargeTime(days: number, planIntervals: number = 1): string {
  const date = new Date();
  
  if (days === 0) {
    // Existing user: they pay full amount upfront via authorization
    // Next recurring charge should be after the plan interval (1 month or 3 months)
    date.setMonth(date.getMonth() + planIntervals);
  } else {
    // New user with trial: first charge after trial period
    date.setDate(date.getDate() + days);
  }
  
  date.setHours(10, 0, 0, 0);
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  // Return in ISO 8601 format with IST offset
  return `${year}-${month}-${day}T10:00:00+05:30`;
}

// Recurring plan configurations, derived from the shared plan catalog so prices
// live in exactly one place (src/lib/plans.ts).
const PLAN_CONFIGS: Record<string, { name: string; amount: number; intervalType: string; intervals: number }> =
  Object.fromEntries(
    PLAN_LIST.filter((p) => p.billing === 'recurring').map((p) => [
      p.key,
      {
        name: p.name,
        amount: p.amount,
        intervalType: p.intervalType ?? 'MONTH',
        intervals: p.intervals ?? 1,
      },
    ])
  );

export async function createSubscription(params: {
  planId: string; // a recurring PlanKey, e.g. 'foundation-1m'
  subscriptionId: string;
  customerEmail: string;
  customerPhone: string;
  customerName?: string;
  trialDays: number;
  returnUrl: string;
}) {
  const planConfig = PLAN_CONFIGS[params.planId] || PLAN_CONFIGS['foundation-1m'];
  
  const body: Record<string, unknown> = {
    subscription_id: params.subscriptionId,
    customer_details: {
      customer_name: params.customerName || params.customerEmail.split('@')[0],
      customer_email: params.customerEmail,
      customer_phone: params.customerPhone, // Just 10 digits, no +91
    },
    plan_details: {
      plan_name: planConfig.name,
      plan_type: 'PERIODIC',
      plan_amount: planConfig.amount,
      plan_max_amount: planConfig.amount,
      plan_max_cycles: 0, // 0 = unlimited
      plan_intervals: planConfig.intervals,
      plan_interval_type: planConfig.intervalType,
      plan_currency: 'INR',
    },
    authorization_details: {
      // Existing users (no trial): charge full plan amount upfront
      // New users (with trial): charge ₹1 for authorization only
      authorization_amount: params.trialDays === 0 ? planConfig.amount : 1,
      authorization_amount_refund: false,
      payment_methods: ['upi', 'card', 'enach'],
    },
    subscription_meta: {
       return_url: params.returnUrl,
      notification_channel: ['EMAIL', 'SMS'],
    },
  };

  // Set first charge time
  // For trial users: charge after trial period (e.g., 7 days)
  // For existing users: they pay full amount now, next charge after plan interval
  const firstChargeTime = getFirstChargeTime(params.trialDays, planConfig.intervals);
  body.subscription_first_charge_time = firstChargeTime;
  console.log(`[Cashfree] Setting subscription_first_charge_time to: ${firstChargeTime} (trialDays: ${params.trialDays}, auth_amount: ${params.trialDays === 0 ? planConfig.amount : 1})`);

  console.log('[Cashfree] Creating subscription with body:', JSON.stringify(body, null, 2));

  const response = await fetch(`${BASE_URL}/subscriptions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  const data = await response.json();
  console.log('[Cashfree] Response:', JSON.stringify(data, null, 2));
  return data;
}

export async function getSubscriptionStatus(subscriptionId: string) {
  const response = await fetch(`${BASE_URL}/subscriptions/${subscriptionId}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  const data = await response.json();
  return data;
}

// ─── One-time Orders (Cashfree PG) ──────────────────────────
// Used for the "One time" products (Elite Mentorship, Link 1/2/3). Unlike
// subscriptions, these are a single full charge with no mandate/trial.

export async function createOrder(params: {
  orderId: string;
  amount: number;
  customerEmail: string;
  customerPhone: string;
  planKey: string;
  returnUrl: string;
}) {
  const body = {
    order_id: params.orderId,
    order_amount: params.amount,
    order_currency: 'INR',
    customer_details: {
      // customer_id is required by Cashfree — derive a stable id from email.
      customer_id: crypto.createHash('md5').update(params.customerEmail.toLowerCase()).digest('hex'),
      customer_email: params.customerEmail,
      customer_phone: params.customerPhone, // 10 digits, no +91
    },
    order_meta: {
      return_url: params.returnUrl,
    },
    order_tags: {
      plan: params.planKey,
    },
  };

  console.log('[Cashfree] Creating order with body:', JSON.stringify(body, null, 2));

  const response = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  const data = await response.json();
  console.log('[Cashfree] Order response:', JSON.stringify(data, null, 2));
  return data;
}

export async function getOrderStatus(orderId: string) {
  const response = await fetch(`${BASE_URL}/orders/${orderId}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  const data = await response.json();
  return data;
}

export async function verifyPayment(orderId: string) {
  const response = await fetch(`${BASE_URL}/orders/${orderId}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  const data = await response.json();
  return data;
}

export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', CASHFREE_SECRET_KEY)
    .update(rawBody)
    .digest('base64');

  return signature === expectedSignature;
}

// PG order webhooks sign `timestamp + rawBody` (not just the body) and send it
// in the `x-webhook-signature` header alongside `x-webhook-timestamp`. This is a
// different scheme than the subscription webhook's `x-cashfree-signature`.
export function verifyOrderWebhookSignature(
  timestamp: string,
  rawBody: string,
  signature: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', CASHFREE_SECRET_KEY)
    .update(timestamp + rawBody)
    .digest('base64');

  return signature === expectedSignature;
}

export function generateSubscriptionId(): string {
  return `sub_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export function generateOrderId(): string {
  return `ord_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}
