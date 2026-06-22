import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import { getSubscriptionStatus } from '@/lib/cashfree';
import { removeRoleFromUser } from '@/lib/discord';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Find all users with active channel access.
    // `lifetime` buyers are paid-in-advance (one-time products) — never kick them.
    const users = await User.find({
      channelAdded: true,
      cashfreeSubscriptionId: { $ne: null },
      lifetime: { $ne: true },
    });

    let kicked = 0;
    let checked = 0;

    const INACTIVE_STATUSES = [
      'CANCELLED',
      'EXPIRED',
      'COMPLETED',
      'PAST_DUE',
      'ON_HOLD',
      'CUSTOMER_CANCELLED',
    ];

    async function kickUser(user: InstanceType<typeof User>, reason: string) {
      if (user.discordId) {
        try {
          await removeRoleFromUser(user.discordId);
        } catch (discordErr) {
          console.error(`Error removing role from ${user.email}:`, discordErr);
        }
      }
      user.channelAdded = false;
      user.subscriptionStatus = 'expired';
      user.leftAt = new Date();
      await user.save();
      await AuditLog.create({
        userId: user._id,
        userEmail: user.email,
        action: 'kicked',
        details: reason,
      });
      kicked++;
    }

    // Pass 1: kick users whose Cashfree subscription is in an inactive state
    for (const user of users) {
      checked++;
      try {
        const subStatus = await getSubscriptionStatus(user.cashfreeSubscriptionId!);
        const status = (subStatus.status || subStatus.subscription_status || '').toUpperCase();

        if (INACTIVE_STATUSES.includes(status)) {
          await kickUser(user, `Kicked via cron: subscription status = ${status}`);
        }
      } catch (err) {
        console.error(`Error checking subscription for ${user.email}:`, err);
      }
    }

    // Pass 2: catch trial users whose 7-day window has passed but who were not
    // kicked by webhooks (e.g. Cashfree webhook delivery failure).
    // We check Cashfree live — if the subscription is not ACTIVE, they have not paid.
    const TRIAL_DAYS = 7;
    const trialCutoff = new Date();
    trialCutoff.setDate(trialCutoff.getDate() - TRIAL_DAYS);

    const overdueTrialUsers = await User.find({
      subscriptionStatus: 'trial',
      channelAdded: true,
      lifetime: { $ne: true },
      createdAt: { $lte: trialCutoff },
    });

    for (const user of overdueTrialUsers) {
      if (!user.cashfreeSubscriptionId) {
        await kickUser(user, 'Trial expired: no subscription ID found');
        continue;
      }
      try {
        const subStatus = await getSubscriptionStatus(user.cashfreeSubscriptionId);
        const status = (subStatus.status || subStatus.subscription_status || '').toUpperCase();

        if (status !== 'ACTIVE') {
          await kickUser(user, `Trial expired: subscription status = ${status || 'unknown'}`);
        }
      } catch (err) {
        console.error(`Error checking trial subscription for ${user.email}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      checked,
      kicked,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
