import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { createSubscription, generateSubscriptionId } from '@/lib/cashfree';
import { getPlan } from '@/lib/plans';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { email, mobile, plan = 'foundation-1m' } = await request.json();

    if (!email || !mobile) {
      return NextResponse.json(
        { error: 'Email and mobile number are required' },
        { status: 400 }
      );
    }

    const planDef = getPlan(plan);
    if (!planDef || planDef.billing !== 'recurring') {
      return NextResponse.json(
        { error: 'Invalid plan type' },
        { status: 400 }
      );
    }

    // Eligibility check is read-only. The user record itself is NOT created here —
    // the Cashfree webhook will create it only after authorization/payment succeeds.
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    const trialDays = existing && existing.subscriptionStatus && existing.subscriptionStatus !== 'none' ? 0 : 7;

    const subscriptionId = generateSubscriptionId();

    const result = await createSubscription({
      planId: plan,
      subscriptionId,
      customerEmail: email,
      customerPhone: mobile,
      trialDays,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/return?sub_id=${subscriptionId}`,
    });

    if (result.type === 'invalid_request_error' || result.code || result.status === 'ERROR') {
      console.error('Cashfree subscription error:', result);
      return NextResponse.json(
        { error: result.message || 'Failed to create subscription' },
        { status: 500 }
      );
    }

    console.log('Cashfree Success Result:', JSON.stringify(result, null, 2));

    return NextResponse.json({
      success: true,
      subscriptionId,
      subscriptionSessionId: result.subscription_session_id,
      paymentLink: `https://subscription.cashfree.com/subscription/session/${result.subscription_session_id}`,
      trialDays,
      plan,
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
