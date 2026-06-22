import { NextRequest, NextResponse } from 'next/server';
import { createOrder, generateOrderId } from '@/lib/cashfree';
import { getPlan } from '@/lib/plans';

// Creates a one-time Cashfree order for the "One time" products. No DB write
// happens here — the user record is materialized by the order webhook only
// after Cashfree confirms the payment succeeded (mirrors the subscribe flow).
export async function POST(request: NextRequest) {
  try {
    const { email, mobile, plan } = await request.json();

    if (!email || !mobile) {
      return NextResponse.json(
        { error: 'Email and mobile number are required' },
        { status: 400 }
      );
    }

    const planDef = getPlan(plan);
    if (!planDef || planDef.billing !== 'onetime') {
      return NextResponse.json(
        { error: 'Invalid plan type' },
        { status: 400 }
      );
    }

    const orderId = generateOrderId();

    const result = await createOrder({
      orderId,
      // Amount comes from the server-side catalog — never trust the client.
      amount: planDef.amount,
      customerEmail: email,
      customerPhone: mobile,
      planKey: planDef.key,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/return?order_id=${orderId}`,
    });

    if (result.type === 'invalid_request_error' || result.code || !result.payment_session_id) {
      console.error('Cashfree order error:', result);
      return NextResponse.json(
        { error: result.message || 'Failed to create order' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      orderId,
      paymentSessionId: result.payment_session_id,
      plan: planDef.key,
    });
  } catch (error) {
    console.error('Order error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
