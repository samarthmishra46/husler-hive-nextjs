import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import { getSubscriptionStatus } from '@/lib/cashfree';
import { removeRoleFromUser, getPaidRoleState } from '@/lib/discord';

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
        // Capture the status before any normalization for the audit detail.
        const prevStatus = user.subscriptionStatus;

        // Check live Discord state rather than trusting the stale `channelAdded`
        // flag — this is what fixes the "no active plan but still in Discord" bug.
        // Gate on the ROLE, not on guild membership: revoking access leaves the
        // person in the guild, so a membership check stays true forever and we'd
        // re-revoke and re-log them every night.
        const roleState = await getPaidRoleState(user.discordId!);
        if (roleState === 'has-role') {
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
            details: `Reconciliation: no active plan (status=${prevStatus})`,
          });
        }

        // Sync our flags to reality AND normalize any legacy ('trial'/'none')
        // status, so the save always passes the new enum — otherwise a legacy
        // row's save throws and `channelAdded` is never cleared (dashboard keeps
        // showing "In Channel" even though the role was removed).
        let dirty = false;
        if (user.channelAdded) {
          user.channelAdded = false;
          if (!user.leftAt) user.leftAt = new Date();
          dirty = true;
        }
        if (!['active', 'expired'].includes(prevStatus)) {
          user.subscriptionStatus = 'expired';
          dirty = true;
        }
        if (dirty) await user.save();
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
