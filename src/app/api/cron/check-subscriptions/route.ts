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

    // Find all users with active channel access
    const users = await User.find({
      channelAdded: true,
      cashfreeSubscriptionId: { $ne: null },
    });

    let kicked = 0;
    let checked = 0;

    for (const user of users) {
      checked++;

      try {
        const subStatus = await getSubscriptionStatus(
          user.cashfreeSubscriptionId!
        );

        const status = subStatus.status || subStatus.subscription_status;

        // If subscription is not active, remove role
        if (
          status === 'CANCELLED' ||
          status === 'EXPIRED' ||
          status === 'COMPLETED' ||
          status === 'PAST_DUE'
        ) {
          if (user.discordId) {
            try {
              await removeRoleFromUser(user.discordId);
            } catch (discordErr) {
              console.error(
                `Error removing role from ${user.email}:`,
                discordErr
              );
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
            details: `Kicked via cron: subscription status = ${status}`,
          });

          kicked++;
        }
      } catch (err) {
        console.error(`Error checking subscription for ${user.email}:`, err);
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
