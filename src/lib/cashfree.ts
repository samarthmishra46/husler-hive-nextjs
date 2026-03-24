import crypto from 'crypto';

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID!;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY!;
const CASHFREE_ENV = process.env.CASHFREE_ENV || 'sandbox';

const BASE_URL =
  CASHFREE_ENV === 'production'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';

const SUBS_BASE_URL =
  CASHFREE_ENV === 'production'
    ? 'https://api.cashfree.com/api/v2'
    : 'https://sandbox.cashfree.com/api/v2';

function getHeaders(): Record<string, string> {
  return {
    'x-client-id': CASHFREE_APP_ID,
    'x-client-secret': CASHFREE_SECRET_KEY,
    'x-api-version': '2023-08-01',
    'Content-Type': 'application/json',
  };
}

export async function createSubscription(params: {
  planId: string;
  subscriptionId: string;
  customerEmail: string;
  customerPhone: string;
  customerName?: string;
  trialDays: number;
  returnUrl: string;
}) {
  const body: Record<string, unknown> = {
    subscriptionId: params.subscriptionId,
    planId: params.planId,
    customerEmail: params.customerEmail,
    customerPhone: params.customerPhone,
    customerName: params.customerName || params.customerEmail.split('@')[0],
    returnUrl: params.returnUrl,
    authorizationDetails: {
      authorizationAmount: 1,
    },
  };

  if (params.trialDays > 0) {
    body.subscriptionFirstChargeTime = getTrialEndDate(params.trialDays);
  }

  const response = await fetch(`${SUBS_BASE_URL}/subscriptions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return data;
}

export async function getSubscriptionStatus(subscriptionId: string) {
  const response = await fetch(`${SUBS_BASE_URL}/subscriptions/${subscriptionId}`, {
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

function getTrialEndDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function generateSubscriptionId(): string {
  return `sub_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}
