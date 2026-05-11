import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { createSubscription, generateSubscriptionId } from '@/lib/cashfree';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { email, mobile, plan = 'monthly' } = await request.json();

    if (!email || !mobile) {
      return NextResponse.json(
        { error: 'Email and mobile number are required' },
        { status: 400 }
      );
    }

    // Validate plan type
    if (!['monthly', 'quarterly'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan type' },
        { status: 400 }
      );
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    let trialDays = 7;

    if (user) {
      // Only give free trial if status is 'none' or empty (failed initial payment)
      // For trial, active, expired, cancelled - charge immediately (no free trial)
      if (user.subscriptionStatus && user.subscriptionStatus !== 'none') {
        trialDays = 0;
      }
      // For 'none' or empty - give trial (trialDays stays 7)
    }

    if (!user) {
      user = await User.create({
        email,
        mobile,
        subscriptionStatus: 'none',
        trialUsed: false,
        channelAdded: false,
        plan, // Store the plan type
      });
    } else {
      // Update mobile and plan if changed
      user.mobile = mobile;
      user.plan = plan;
      await user.save();
    }

    const subscriptionId = generateSubscriptionId();

    const result = await createSubscription({
      planId: plan, // 'monthly' or 'quarterly' - plan config is in cashfree.ts
      subscriptionId,
      customerEmail: email,
      customerPhone: mobile,
      trialDays,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/return?sub_id=${subscriptionId}&user_id=${user._id}`,
    });

    // Check for errors in the new API format
    if (result.type === 'invalid_request_error' || result.code || result.status === 'ERROR') {
      console.error('Cashfree subscription error:', result);
      return NextResponse.json(
        { error: result.message || 'Failed to create subscription' },
        { status: 500 }
      );
    }

    console.log('Cashfree Success Result:', JSON.stringify(result, null, 2));

    // Save the Cashfree subscription ID so the webhook can find this user later.
    // Do NOT touch subscriptionStatus or trialUsed here — those flip only when
    // Cashfree confirms via webhook (SUBSCRIPTION_AUTH_STATUS / SUBSCRIPTION_STATUS_CHANGED
    // / SUBSCRIPTION_PAYMENT_SUCCESS). Setting them now would mark drop-offs as active.
    user.cashfreeSubscriptionId = subscriptionId;
    await user.save();

    return NextResponse.json({
      success: true,
      subscriptionId,
      // Return both session ID and direct payment link
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
