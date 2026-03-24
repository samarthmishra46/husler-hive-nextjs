import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import {
  exchangeCodeForToken,
  getDiscordUser,
  addUserToGuild,
  addUserToChannel,
} from '@/lib/discord';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/discord/connect?error=no_code`
      );
    }

    // Exchange code for token
    const tokenData = await exchangeCodeForToken(code);
    const accessToken = tokenData.access_token;

    // Get Discord user info
    const discordUser = await getDiscordUser(accessToken);

    await dbConnect();

    // Find the most recent user who hasn't connected Discord yet
    // They should have come from the payment flow
    const user = await User.findOne({
      discordId: null,
      subscriptionStatus: { $in: ['trial', 'active'] },
    }).sort({ updatedAt: -1 });

    if (!user) {
      // Try to find by existing Discord ID (reconnecting)
      const existingUser = await User.findOne({ discordId: discordUser.id });
      if (existingUser) {
        // Update access token
        existingUser.discordAccessToken = accessToken;
        existingUser.discordUsername =
          discordUser.username + (discordUser.discriminator !== '0' ? `#${discordUser.discriminator}` : '');
        await existingUser.save();

        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?discord=reconnected`
        );
      }

      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/discord/connect?error=no_subscription`
      );
    }

    // Update user with Discord info
    user.discordId = discordUser.id;
    user.discordUsername =
      discordUser.username + (discordUser.discriminator !== '0' ? `#${discordUser.discriminator}` : '');
    user.discordAccessToken = accessToken;

    // Add user to guild and channel
    try {
      await addUserToGuild(discordUser.id, accessToken);
    } catch (err) {
      console.log('User may already be in guild:', err);
    }

    try {
      await addUserToChannel(discordUser.id);
      user.channelAdded = true;
      user.joinedAt = new Date();
    } catch (err) {
      console.error('Error adding to channel:', err);
    }

    await user.save();

    // Log
    await AuditLog.create({
      userId: user._id,
      userEmail: user.email,
      action: 'joined_channel',
      details: `Discord: ${user.discordUsername} (${discordUser.id})`,
    });

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?discord=connected`
    );
  } catch (error) {
    console.error('Discord callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/discord/connect?error=callback_failed`
    );
  }
}
