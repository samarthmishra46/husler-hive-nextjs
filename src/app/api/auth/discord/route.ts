import { NextRequest, NextResponse } from 'next/server';
import { getDiscordAuthUrl } from '@/lib/discord';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    // Generate state with userId embedded for secure user tracking
    // Format: randomToken_userId (or just randomToken if no userId)
    const randomToken = Math.random().toString(36).substring(2, 15);
    const state = userId ? `${randomToken}_${userId}` : randomToken;
    
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
