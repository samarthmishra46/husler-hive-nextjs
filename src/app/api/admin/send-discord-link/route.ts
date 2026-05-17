import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getDiscordAuthUrl } from '@/lib/discord';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const isAdmin = await isAdminAuthenticated();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  await dbConnect();
  const user = await User.findById(userId);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const state = Buffer.from(JSON.stringify({ userId: user._id, email: user.email })).toString('base64');
  const discordLink = getDiscordAuthUrl(state);

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
   to: user.email, 
    subject: "Your Discord Access Link — Hustler's Hive",
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #fff;">
        <h2 style="font-size: 1.4rem; font-weight: 800; color: #1a1a2e; margin-bottom: 8px;">
          Join the Hustler's Hive Discord
        </h2>
        <p style="color: #6b6b8a; font-size: 0.95rem; margin-bottom: 24px;">
          Here is your personal Discord access link. Click the button below to connect your Discord account and join the channel.
        </p>
        <a href="${discordLink}"
          style="display: inline-block; padding: 14px 28px; background: #7c3aed; color: #fff;
                 border-radius: 10px; font-weight: 700; font-size: 0.95rem; text-decoration: none;">
          Join Discord →
        </a>
        <p style="margin-top: 24px; font-size: 0.78rem; color: #a0a0b8;">
          This link is personal to your account. Do not share it with anyone.<br/>
          If you did not request this, please ignore this email.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error('Resend error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}