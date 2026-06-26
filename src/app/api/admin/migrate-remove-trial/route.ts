import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import { removeRoleFromUser } from '@/lib/discord';

// Legacy 'none'/'trial' values are no longer in the schema enum, so these
// one-off migration filters can't be expressed with the typed query — cast them.
/* eslint-disable @typescript-eslint/no-explicit-any */
const TRIAL_WITH_ACCESS: any = {
  subscriptionStatus: 'trial',
  channelAdded: true,
  discordId: { $ne: null },
};
const LEGACY_STATUSES: any = {
  subscriptionStatus: { $in: ['none', 'trial'] },
};
/* eslint-enable @typescript-eslint/no-explicit-any */

// ─── One-time migration: remove the free-trial era statuses ──────────────
//
// The subscriptionStatus enum collapsed from `none | trial | active | expired`
// to `active | expired`. Any document still holding `none`/`trial` would fail
// enum validation the next time it's saved, so flip them all to `expired`.
//
// Per the rollout decision, existing mid-trial members are treated as expired
// NOW: those who still have Discord access get the paid role revoked here so we
// don't wait for the next cron run.
//
// Protected by CRON_SECRET (same scheme as the cron). Run once:
//   curl -X POST https://app.hustlershive.club/api/admin/migrate-remove-trial \
//        -H "Authorization: Bearer $CRON_SECRET"
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();

    // 1. Ex-trial members who still hold Discord access → revoke + expire.
    //    We must set status='expired' on the same save, since saving a doc that
    //    still reads 'trial' would now fail enum validation.
    const trialWithAccess = await User.find(TRIAL_WITH_ACCESS);

    let revoked = 0;
    for (const user of trialWithAccess) {
      try {
        await removeRoleFromUser(user.discordId!);
      } catch (err) {
        console.error(`[migrate] role removal failed for ${user.email}:`, err);
      }
      user.subscriptionStatus = 'expired';
      user.channelAdded = false;
      if (!user.leftAt) user.leftAt = new Date();
      await user.save();
      await AuditLog.create({
        userId: user._id,
        userEmail: user.email,
        action: 'role_removed',
        details: 'Migration: free trial removed — trial access revoked',
      });
      revoked++;
    }

    // 2. Everyone else still on a legacy 'none'/'trial' status → 'expired'.
    //    updateMany ($set to a valid enum value) is safe for the remaining rows.
    const result = await User.updateMany(LEGACY_STATUSES, {
      $set: { subscriptionStatus: 'expired' },
    });

    return NextResponse.json({
      success: true,
      revokedAccess: revoked,
      statusUpdated: result.modifiedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[migrate] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
