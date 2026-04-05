import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      // New user - gets free trial
      return NextResponse.json({
        exists: false,
        eligibleForTrial: true,
      });
    }

    // User exists - check if eligible for trial
    // Only 'none' or empty status gets free trial
    const eligibleForTrial = !user.subscriptionStatus || user.subscriptionStatus === 'none';

    return NextResponse.json({
      exists: true,
      eligibleForTrial,
      subscriptionStatus: user.subscriptionStatus,
    });
  } catch (error) {
    console.error('Check user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
