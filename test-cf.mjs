import fs from 'fs';
import path from 'path';

async function test() {
  const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
  const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
  const CASHFREE_PLAN_ID = process.env.CASHFREE_PLAN_ID;
  const SUBS_BASE_URL = 'https://sandbox.cashfree.com/api/v2';

  if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY || !CASHFREE_PLAN_ID) {
    console.error('Missing env vars');
    return;
  }

  const subId = `sub_${Date.now()}`;

  const body = {
    subscriptionId: subId,
    planId: CASHFREE_PLAN_ID,
    customerEmail: 'test@example.com',
    customerPhone: '9999999999',
    customerName: 'Test User',
    returnUrl: 'http://localhost:3000/verify',
    authorizationDetails: {
      authorizationAmount: 1,
    },
  };

  try {
    const res = await fetch(`${SUBS_BASE_URL}/subscriptions`, {
      method: 'POST',
      headers: {
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET_KEY,
        'x-api-version': '2023-08-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await res.json();
    console.log('--- CASHFREE RESPONSE ---');
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}

test();
