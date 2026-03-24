import { NextResponse } from 'next/server';
import { getDiscordAuthUrl } from '@/lib/discord';

export async function GET() {
  try {
    // Generate a random state for CSRF protection
    const state = Math.random().toString(36).substring(2, 15);
    const authUrl = getDiscordAuthUrl(state);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Discord auth error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Discord auth' },
      { status: 500 }
    );
  }
}
