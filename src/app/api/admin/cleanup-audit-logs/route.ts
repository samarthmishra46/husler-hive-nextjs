import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import AuditLog from '@/models/AuditLog';
import { isAdminAuthenticated } from '@/lib/admin-auth';

// One-off purge of the duplicate reconciliation entries left behind by the cron
// bug: Pass 2 used to re-log `role_removed` for every expired user on every run,
// so a single revocation produced one entry per day, forever.
//
// Keeps the EARLIEST entry per user (that one records the real revocation) and
// deletes the rest. Everything else in the audit log — payments, joins, kicks,
// and manual role removals, which don't carry the `Reconciliation:` prefix — is
// left untouched.
//
// Pass ?dryRun=1 to see the counts without deleting anything.

interface ReconGroup {
  _id: mongoose.Types.ObjectId | null;
  keep: mongoose.Types.ObjectId;
  ids: mongoose.Types.ObjectId[];
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const dryRun = new URL(request.url).searchParams.get('dryRun') === '1';

    const groups = await AuditLog.aggregate<ReconGroup>([
      { $match: { action: 'role_removed', details: { $regex: '^Reconciliation:' } } },
      { $sort: { createdAt: 1 } },
      { $group: { _id: '$userId', keep: { $first: '$_id' }, ids: { $push: '$_id' } } },
    ]);

    const scanned = groups.reduce((sum, g) => sum + g.ids.length, 0);
    const toDelete = groups.flatMap((g) =>
      g.ids.filter((id) => String(id) !== String(g.keep))
    );

    if (!dryRun && toDelete.length > 0) {
      await AuditLog.deleteMany({ _id: { $in: toDelete } });
    }

    return NextResponse.json({
      success: true,
      dryRun,
      usersAffected: groups.length,
      scanned,
      deleted: toDelete.length,
    });
  } catch (error) {
    console.error('Cleanup audit logs error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
