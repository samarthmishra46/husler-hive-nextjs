import crypto from 'crypto';

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
function getFirstChargeTime(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  // Set to 10:00 AM IST for the charge
  date.setHours(10, 0, 0, 0);
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  // Return in ISO 8601 format with IST offset
  return `${year}-${month}-${day}T10:00:00+05:30`;
}

// Plan configurations
const PLAN_CONFIGS: Record<string, { name: string; amount: number; intervalType: string; intervals: number }> = {
  monthly: {
    name: 'Monthly Membership',
    amount: 4999,
    intervalType: 'MONTH',
    intervals: 1,
  },
  quarterly: {
    name: '3-Month Bundle',
    amount: 12997,
    intervalType: 'MONTH',
    intervals: 3,
  },
};

export async function createSubscription(params: {
  planId: string; // 'monthly' or 'quarterly'
  subscriptionId: string;
  customerEmail: string;
  customerPhone: string;
  customerName?: string;
  trialDays: number;
  returnUrl: string;
}) {
  const planConfig = PLAN_CONFIGS[params.planId] || PLAN_CONFIGS.monthly;
  
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
      authorization_amount: 1, // ₹1 auth amount
      authorization_amount_refund: false,
      payment_methods: ['upi', 'card', 'enach'],
    },
    subscription_meta: {
       return_url: params.returnUrl,
      notification_channel: ['EMAIL', 'SMS'],
    },
  };

  // Set first charge time (7 days from now for trial)
  if (params.trialDays > 0) {
    body.subscription_first_charge_time = getFirstChargeTime(params.trialDays);
    console.log(`[Cashfree] Setting subscription_first_charge_time to: ${body.subscription_first_charge_time} (${params.trialDays} days trial)`);
  }

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

export function generateSubscriptionId(): string {
  return `sub_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}
