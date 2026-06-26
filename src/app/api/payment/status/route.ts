import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

// Polled by /payment/verify while it waits for the Cashfree webhook to
// materialize the user. Returns ready=true once the user exists with an
// active/trial subscription, along with the user_id needed for Discord OAuth.
export async function GET(request: NextRequest) {
  try {
    const params = new URL(request.url).searchParams;
    const subId = params.get('sub_id');
    const orderId = params.get('order_id');
    if (!subId && !orderId) {
      return NextResponse.json({ error: 'sub_id or order_id is required' }, { status: 400 });
    }

    await dbConnect();

    // One-time orders are matched by cashfreeOrderId; subscriptions by cashfreeSubscriptionId.
    const user = orderId
      ? await User.findOne({ cashfreeOrderId: orderId })
      : await User.findOne({ cashfreeSubscriptionId: subId });
    if (!user) {
      return NextResponse.json({ ready: false });
    }

    const ready = user.subscriptionStatus === 'active';

    return NextResponse.json({
      ready,
      userId: String(user._id),
      subscriptionStatus: user.subscriptionStatus,
      discordConnected: !!user.discordId,
    });
  } catch (error) {
    console.error('Payment status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
