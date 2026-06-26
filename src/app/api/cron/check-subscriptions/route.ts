import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import { getSubscriptionStatus } from '@/lib/cashfree';
import { removeRoleFromUser, getGuildMember } from '@/lib/discord';

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

    // Pass 2: reconciliation — catch users with no active plan who are still in
    // Discord but were missed by webhooks/Pass 1 (e.g. the `channelAdded` flag
    // desynced, or a webhook never arrived). We only look at users WE know about
    // (a linked discordId in our DB); members who joined via other invites are
    // never in this query and are never touched. Lifetime buyers and active
    // subscribers are entitled, so they're excluded.
    let reconciled = 0;
    const orphans = await User.find({
      discordId: { $ne: null },
      lifetime: { $ne: true },
      subscriptionStatus: { $ne: 'active' },
    });

    for (const user of orphans) {
      checked++;
      try {
        // Check live Discord state rather than trusting the stale `channelAdded`
        // flag — this is what fixes the "no active plan but still in Discord" bug.
        const member = await getGuildMember(user.discordId!);
        if (member) {
          // Still in the guild → strip the paid role.
          try {
            await removeRoleFromUser(user.discordId!);
          } catch (discordErr) {
            console.error(`Error removing role from ${user.email}:`, discordErr);
          }
          reconciled++;
          await AuditLog.create({
            userId: user._id,
            userEmail: user.email,
            action: 'role_removed',
            details: `Reconciliation: no active plan (status=${user.subscriptionStatus})`,
          });
        }
        // Whether present or already gone, sync our flags to reality.
        if (user.channelAdded) {
          user.channelAdded = false;
          if (!user.leftAt) user.leftAt = new Date();
          await user.save();
        }
      } catch (err) {
        console.error(`Error reconciling Discord access for ${user.email}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      checked,
      kicked,
      reconciled,
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
