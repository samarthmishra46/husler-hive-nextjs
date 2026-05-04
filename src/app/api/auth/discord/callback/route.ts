import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import {
  exchangeCodeForToken,
  getDiscordUser,
  addUserToGuild,
  addRoleToUser,
  getGuildMember,
} from '@/lib/discord';

// Helper to add role with retry logic
async function addRoleWithRetry(discordUserId: string, maxRetries = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await addRoleToUser(discordUserId);
      return true;
    } catch (err) {
      console.error(`Attempt ${attempt}/${maxRetries} to add role failed:`, err);
      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  return false;
}

// Helper to add user to guild with retry logic
async function addToGuildWithRetry(
  discordUserId: string
  , accessToken: string,
  maxRetries = 3
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await addUserToGuild(discordUserId, accessToken);
      return true;
    } catch (err) {
      // User may already be in guild (204 or specific error)
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('204') || errorMessage.includes('already')) {
        console.log('User already in guild');
        return true;
      }
      console.error(`Attempt ${attempt}/${maxRetries} to add to guild failed:`, err);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  // Check if user is already in guild despite errors
  try {
    const member = await getGuildMember(discordUserId);
    if (member) return true;
  } catch {
    // Ignore
  }
  return false;
}

// Extract userId and popup flag from OAuth state parameter
// State formats: randomToken_userId  |  randomToken_userId_POPUP  |  randomToken
function parseState(state: string | null): { userId: string | null; isPopup: boolean } {
  if (!state) return { userId: null, isPopup: false };
  const isPopup = state.endsWith('_POPUP');
  const clean = isPopup ? state.slice(0, -6) : state; // strip '_POPUP'
  const parts = clean.split('_');
  if (parts.length >= 2) {
    return { userId: parts.slice(1).join('_'), isPopup };
  }
  return { userId: null, isPopup };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

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

    // Extract userId and popup flag from state parameter
    const { userId: stateUserId, isPopup } = parseState(state);
    const base = process.env.NEXT_PUBLIC_APP_URL;
    const successUrl = isPopup ? `${base}/discord/done?discord=connected` : `${base}/dashboard?discord=connected`;
    const reconnectUrl = isPopup ? `${base}/discord/done?discord=reconnected` : `${base}/dashboard?discord=reconnected`;

    let user = null;

    // Strategy 1: Find user by userId from state (most reliable)
    if (stateUserId) {
      try {
        user = await User.findById(stateUserId);
        if (user) {
          console.log(`Found user by state userId: ${user.email}`);
        }
      } catch (err) {
        console.log('Could not find user by state userId:', err);
      }
    }

    // Strategy 2: Check if this Discord account is already linked to a user (reconnecting)
    if (!user) {
      const existingUser = await User.findOne({ discordId: discordUser.id });
      if (existingUser) {
        // Update access token for reconnecting user
        existingUser.discordAccessToken = accessToken;
        existingUser.discordUsername =
          discordUser.username + (discordUser.discriminator !== '0' ? `#${discordUser.discriminator}` : '');
        
        // Re-add to guild and role if they have active subscription
        if (['trial', 'active'].includes(existingUser.subscriptionStatus)) {
          await addToGuildWithRetry(discordUser.id, accessToken);
          const roleAdded = await addRoleWithRetry(discordUser.id);
          if (roleAdded) {
            existingUser.channelAdded = true;
            existingUser.joinedAt = new Date();
          }
        }
        
        await existingUser.save();

        return NextResponse.redirect(reconnectUrl);
      }
    }

    // Strategy 3: Fallback - Find the most recent user without Discord (legacy flow)
    if (!user) {
      user = await User.findOne({
        discordId: null,
        subscriptionStatus: { $in: ['trial', 'active'] },
      }).sort({ updatedAt: -1 });

      if (user) {
        console.log(`Found user by legacy fallback: ${user.email}`);
      }
    }

    if (!user) {
      console.error('No user found for Discord connection');
      return NextResponse.redirect(
        `${base}/discord/connect?error=no_subscription`
      );
    }

    // Verify user has active subscription
    if (!['trial', 'active'].includes(user.subscriptionStatus)) {
      console.error(`User ${user.email} has inactive subscription: ${user.subscriptionStatus}`);
      return NextResponse.redirect(
        `${base}/discord/connect?error=no_subscription`
      );
    }

    // Update user with Discord info
    user.discordId = discordUser.id;
    user.discordUsername =
      discordUser.username + (discordUser.discriminator !== '0' ? `#${discordUser.discriminator}` : '');
    user.discordAccessToken = accessToken;

    // Add user to guild with retries
    const addedToGuild = await addToGuildWithRetry(discordUser.id, accessToken);
    if (!addedToGuild) {
      console.error('Failed to add user to guild after retries');
    }

    // Add role with retries
    const roleAdded = await addRoleWithRetry(discordUser.id);
    if (roleAdded) {
      user.channelAdded = true;
      user.joinedAt = new Date();
    } else {
      console.error('Failed to add role after retries');
      user.channelAdded = false;
    }

    await user.save();

    await AuditLog.create({
      userId: user._id,
      userEmail: user.email,
      action: 'joined_channel',
      details: `Discord: ${user.discordUsername} (${discordUser.id})${!roleAdded ? ' - ROLE ADD FAILED' : ''}`,
    });

    return NextResponse.redirect(successUrl);
  } catch (error) {
    console.error('Discord callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/discord/connect?error=callback_failed`
    );
  }
}
