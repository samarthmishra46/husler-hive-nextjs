import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import { getSubscriptionStatus } from '@/lib/cashfree';
import { removeRoleFromUser, getPaidRoleState } from '@/lib/discord';

// Vercel Hobby caps functions at 60s (the default is 10s, which this job exceeds).
export const maxDuration = 60;

// Stop issuing new work with headroom to spare so we return a real summary instead
// of being killed mid-loop.
const DEADLINE_MS = 50_000;
const DEFAULT_MAX_USERS_PER_RUN = 150;

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const startedAt = Date.now();
    const outOfTime = () => Date.now() - startedAt > DEADLINE_MS;

    // Optional override so the initial backlog can be drained in one go rather than
    // over consecutive nights. Still behind CRON_SECRET.
    const limitParam = Number(new URL(request.url).searchParams.get('limit'));
    const maxUsersPerRun =
      Number.isFinite(limitParam) && limitParam > 0 ? limitParam : DEFAULT_MAX_USERS_PER_RUN;

    // Find all users with active channel access.
    // `lifetime` buyers are paid-in-advance (one-time products) — never kick them.
    const users = await User.find({
      channelAdded: true,
      cashfreeSubscriptionId: { $ne: null },
      lifetime: { $ne: true },
    }).limit(maxUsersPerRun);

    let kicked = 0;
    let checked = 0;
    let timedOut = false;

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
      // Deliberately NOT setting accessRevokedAt: the removal above is fire-and-forget
      // and may have silently failed. Leaving the marker null keeps the user in Pass 2's
      // candidate set, so the next run verifies the role is really gone before converging.
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
      if (outOfTime()) { timedOut = true; break; }
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

    // Pass 2: reconciliation — catch users with no active plan who still hold the paid
    // role in Discord but were missed by webhooks/Pass 1 (e.g. the `channelAdded` flag
    // desynced, or a webhook never arrived). We only look at users WE know about (a
    // linked discordId in our DB); members who joined via other invites are never in
    // this query and are never touched. Lifetime buyers and active subscribers are
    // entitled, so they're excluded.
    //
    // `accessRevokedAt: null` is what makes this converge: once we've CONFIRMED with
    // Discord that a user's role is gone, they drop out of this scan permanently. Without
    // it the candidate set grows with every churned user and the job rate-limits itself
    // against Discord.
    let reconciled = 0;
    let confirmedRevoked = 0;
    let errors = 0;

    const orphanQuery = {
      discordId: { $ne: null },
      lifetime: { $ne: true },
      subscriptionStatus: { $ne: 'active' },
      accessRevokedAt: null,
    };
    const orphans = await User.find(orphanQuery).limit(maxUsersPerRun);

    for (const user of orphans) {
      if (outOfTime()) { timedOut = true; break; }
      checked++;
      try {
        // Capture the status before any normalization for the audit detail.
        const prevStatus = user.subscriptionStatus;

        // Check live Discord state rather than trusting the stale `channelAdded` flag.
        // Gate on the ROLE, not on guild membership: revoking access leaves the person
        // in the guild, so a membership check stays true forever and we'd re-revoke
        // (and re-log) the same user every night.
        const roleState = await getPaidRoleState(user.discordId!);

        // Discord couldn't be reached — we know nothing. Touch NOTHING and retry next
        // run. Treating this as "no access" would converge a user who still holds the
        // role, and they'd keep it forever.
        if (roleState === 'unknown') {
          errors++;
          continue;
        }

        if (roleState === 'has-role') {
          try {
            await removeRoleFromUser(user.discordId!);
          } catch (discordErr) {
            // The role is still on them. Record nothing and leave accessRevokedAt null
            // so they stay in the candidate set and we retry — claiming a revocation we
            // didn't perform is worse than trying again tomorrow.
            console.error(`Error removing role from ${user.email}:`, discordErr);
            errors++;
            continue;
          }

          reconciled++;
          await AuditLog.create({
            userId: user._id,
            userEmail: user.email,
            action: 'role_removed',
            details: `Reconciliation: no active plan (status=${prevStatus})`,
          });
        } else {
          // 'no-role' or 'not-member' — Discord confirmed they have no access already.
          // Nothing happened, so nothing is logged; they just converge.
          confirmedRevoked++;
        }

        // We have a definitive answer, so it's safe to converge this user and sync our
        // flags to reality. Also normalizes any legacy ('trial'/'none') status, so the
        // save always passes the current enum — otherwise a legacy row's save throws and
        // `channelAdded` is never cleared (dashboard keeps showing "In Channel" even
        // though the role was removed).
        user.accessRevokedAt = new Date();
        if (user.channelAdded) {
          user.channelAdded = false;
          if (!user.leftAt) user.leftAt = new Date();
        }
        if (!['active', 'expired'].includes(prevStatus)) {
          user.subscriptionStatus = 'expired';
        }
        await user.save();
      } catch (err) {
        console.error(`Error reconciling Discord access for ${user.email}:`, err);
        errors++;
      }
    }

    const remaining = await User.countDocuments(orphanQuery);

    return NextResponse.json({
      success: true,
      checked,
      kicked,
      reconciled,
      confirmedRevoked,
      errors,
      remaining,
      timedOut,
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
