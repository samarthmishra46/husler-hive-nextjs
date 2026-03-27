import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { removeRoleFromUser } from '@/lib/discord';

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Remove paid role from Discord if connected
    if (user.discordId) {
      try {
        await removeRoleFromUser(user.discordId);
      } catch (err) {
        console.error('Error removing role:', err);
      }
    }

    // Update user record
    user.channelAdded = false;
    user.subscriptionStatus = 'expired';
    user.leftAt = new Date();
    await user.save();

    // Log the action
    await AuditLog.create({
      userId: user._id,
      userEmail: user.email,
      action: 'kicked',
      details: 'Manually kicked by admin',
    });

    return NextResponse.json({ success: true, message: `${user.email} has been kicked` });
  } catch (error) {
    console.error('Admin kick error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
