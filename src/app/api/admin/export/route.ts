import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import * as XLSX from 'xlsx';

export async function GET() {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const users = await User.find({}).sort({ createdAt: -1 }).lean();

    const rows = users.map((u: any) => ({
      Email: u.email,
      Mobile: u.mobile,
      'Discord Username': u.discordUsername || '',
      'Discord ID': u.discordId || '',
      Status: u.subscriptionStatus,
      'Channel Added': u.channelAdded ? 'Yes' : 'No',
      'Trial Used': u.trialUsed ? 'Yes' : 'No',
      'Joined At': u.joinedAt ? new Date(u.joinedAt).toLocaleString('en-IN') : '',
      'Created At': new Date(u.createdAt).toLocaleString('en-IN'),
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Users');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="hustlers-hive-users.xlsx"',
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}