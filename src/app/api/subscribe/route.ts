import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import { createSubscription, generateSubscriptionId } from '@/lib/cashfree';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { email, mobile } = await request.json();

    if (!email || !mobile) {
      return NextResponse.json(
        { error: 'Email and mobile number are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    let trialDays = 7;

    if (user && user.trialUsed) {
      // Returning user — no trial, charge immediately
      trialDays = 0;
    }

    if (!user) {
      user = await User.create({
        email,
        mobile,
        subscriptionStatus: 'none',
        trialUsed: false,
        channelAdded: false,
      });
    } else {
      // Update mobile if changed
      user.mobile = mobile;
      await user.save();
    }

    const subscriptionId = generateSubscriptionId();

    const result = await createSubscription({
      planId: process.env.CASHFREE_PLAN_ID!,
      subscriptionId,
      customerEmail: email,
      customerPhone: mobile,
      trialDays,
      returnUrl: `${process.env.CASHFREE_RETURN_URL}?sub_id=${subscriptionId}&user_id=${user._id}`,
    });

    if (result.status === 'ERROR' || result.code) {
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
      details: `Subscription created: ${subscriptionId}, Trial: ${trialDays} days`,
    });

    return NextResponse.json({
      success: true,
      subscriptionId,
      paymentLink:
        result.authLink ||
        result.authorizationLink ||
        result.authorization_link ||
        result.authorizationDetails?.authLink ||
        result.authorizationDetails?.authorizationLink,
      trialDays,
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
