import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Payment from '@/models/Payment';
import User from '@/models/User';
import { isAdminAuthenticated } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all';
    const type = searchParams.get('type') || 'all';

    const now = new Date();

    // Date range filter
    const dateFilter: Record<string, unknown> = {};
    if (period === 'this_month') {
      dateFilter.createdAt = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
    } else if (period === 'last_month') {
      dateFilter.createdAt = {
        $gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        $lt: new Date(now.getFullYear(), now.getMonth(), 1),
      };
    } else if (period === 'last_3_months') {
      dateFilter.createdAt = { $gte: new Date(now.getFullYear(), now.getMonth() - 3, 1) };
    }

    // Payment type filter based on amount
    // trial = ₹1 authorization payments, active = ₹4999 / ₹12997
    const amountFilter: Record<string, unknown> = {};
    if (type === 'trial') {
      amountFilter.amount = { $lt: 100 };
    } else if (type === 'active') {
      amountFilter.amount = { $gte: 4999 };
    }

    const payments = await Payment.find({
      status: 'success',
      ...dateFilter,
      ...amountFilter,
    })
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    // Enrich with user email
    const userIds = [...new Set(payments.map((p) => p.userId.toString()))];
    const users = await User.find({ _id: { $in: userIds } })
      .select('email subscriptionStatus')
      .lean();
    const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));

    const result = payments.map((p) => ({
      _id: p._id,
      cfPaymentId: p.cfPaymentId || '—',
      amount: p.amount,
      paidAt: p.paidAt || p.createdAt,
      userEmail: userMap[p.userId.toString()]?.email || '—',
      paymentType: p.amount < 100 ? 'trial' : 'active',
    }));

    return NextResponse.json({ payments: result });
  } catch (error) {
    console.error('Admin payments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
