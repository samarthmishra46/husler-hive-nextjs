import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
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
      // User exists in database = they've been through signup before
      // No free trial for returning users, charge immediately
      trialDays = 0;
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

    // Update user with subscription info
    user.cashfreeSubscriptionId = subscriptionId;
    user.subscriptionStatus = trialDays > 0 ? 'trial' : 'active';
    user.trialUsed = true;
    await user.save();

    // Log the event
    await AuditLog.create({
      userId: user._id,
      userEmail: email,
      action: trialDays > 0 ? 'trial_started' : 'subscribed',
      details: `Subscription created: ${subscriptionId}, Plan: ${plan}, Trial: ${trialDays} days`,
    });

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
