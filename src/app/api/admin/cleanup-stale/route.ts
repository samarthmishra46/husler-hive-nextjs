import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Payment from '@/models/Payment';
import { isAdminAuthenticated } from '@/lib/admin-auth';

const SUBSCRIPTION_MIN_AMOUNT = 4999;

// Recompute subscriptionStatus from real Payment records.
// Rules:
//   - has a successful payment ≥ ₹4999  → 'active'
//   - has only a trial-auth success     → 'trial'
//   - no successful payment             → 'none'  (drop-off at Cashfree)
// We only ever touch users currently marked 'active' or 'trial' — never
// downgrade an 'expired' user (subscription was cancelled/refunded).
export async function POST() {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const candidates = await User.find({
      subscriptionStatus: { $in: ['active', 'trial'] },
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
      const correct: 'active' | 'trial' | 'none' =
        maxAmount >= SUBSCRIPTION_MIN_AMOUNT
          ? 'active'
          : maxAmount > 0
          ? 'trial'
          : 'none';

      if (correct !== user.subscriptionStatus) {
        changes.push({
          email: user.email,
          from: user.subscriptionStatus,
          to: correct,
        });
      }
    }

    // Apply in three batched updates (one per target status)
    for (const target of ['active', 'trial', 'none'] as const) {
      const ids = changes
        .filter((c) => c.to === target)
        .map(
          (c) => candidates.find((u) => u.email === c.email)!._id
        );
      if (ids.length === 0) continue;

      const update: Record<string, unknown> = { subscriptionStatus: target };
      if (target === 'none') {
        update.trialUsed = false;
        update.cashfreeSubscriptionId = null;
      } else if (target === 'trial') {
        update.trialUsed = true;
      }
      await User.updateMany({ _id: { $in: ids } }, { $set: update });
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
