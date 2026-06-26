import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Payment from '@/models/Payment';
import { isAdminAuthenticated } from '@/lib/admin-auth';

const SUBSCRIPTION_MIN_AMOUNT = 4999;

// Recompute subscriptionStatus from real Payment records.
// Rules:
//   - has a successful payment ≥ ₹4999  → 'active'
//   - no successful payment ≥ ₹4999     → 'expired'  (drop-off at Cashfree)
// We only ever touch users currently marked 'active' — demoting those with no
// real payment to 'expired'. Already-'expired' users are left alone.
export async function POST() {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const candidates = await User.find({
      subscriptionStatus: 'active',
    }).select('_id email subscriptionStatus');

    const successByUser = await Payment.aggregate<{
      _id: unknown;
      maxAmount: number;
    }>([
      { $match: { status: 'success' } },
      { $group: { _id: '$userId', maxAmount: { $max: '$amount' } } },
    ]);
    const maxAmountByUser = new Map<string, number>(
      successByUser.map((row) => [String(row._id), row.maxAmount])
    );

    const changes: Array<{ email: string; from: string; to: string }> = [];

    for (const user of candidates) {
      const maxAmount = maxAmountByUser.get(String(user._id)) ?? 0;
      // 'active' is correct only with a real ₹4999+ payment; otherwise demote.
      if (maxAmount < SUBSCRIPTION_MIN_AMOUNT) {
        changes.push({
          email: user.email,
          from: user.subscriptionStatus,
          to: 'expired',
        });
      }
    }

    const ids = changes.map(
      (c) => candidates.find((u) => u.email === c.email)!._id
    );
    if (ids.length > 0) {
      await User.updateMany(
        { _id: { $in: ids } },
        { $set: { subscriptionStatus: 'expired', trialUsed: false } }
      );
    }

    return NextResponse.json({
      success: true,
      scanned: candidates.length,
      changed: changes.length,
      changes,
    });
  } catch (error) {
    console.error('Cleanup stale users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
