import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Payment from '@/models/Payment';
import AuditLog from '@/models/AuditLog';
import { isAdminAuthenticated } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      activeUsers,
      trialUsers,
      totalRevenueAgg,
      monthlyRevenueAgg,
      recentActivity,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ subscriptionStatus: 'active' }),
      User.countDocuments({ subscriptionStatus: 'trial' }),
      Payment.aggregate([
        { $match: { status: 'success', amount: { $gte: 4999 } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        { $match: { status: 'success', amount: { $gte: 4999 }, createdAt: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      AuditLog.find().sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    return NextResponse.json({
      stats: {
        totalUsers,
        activeUsers,
        trialUsers,
        totalRevenue: totalRevenueAgg[0]?.total || 0,
        monthlyRevenue: monthlyRevenueAgg[0]?.total || 0,
      },
      recentActivity,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
