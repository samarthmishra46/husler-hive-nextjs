const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID!;
const DISCORD_PRIVATE_CHANNEL_ID = process.env.DISCORD_PRIVATE_CHANNEL_ID!;

const DISCORD_API = 'https://discord.com/api/v10';

async function discordBotFetch(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${DISCORD_API}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Discord API error: ${response.status} - ${errorText}`);
    throw new Error(`Discord API error: ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

/**
 * Add a user to the Discord server (guild) using their OAuth access token
 */
export async function addUserToGuild(
  discordUserId: string,
  accessToken: string
) {
  return discordBotFetch(`/guilds/${DISCORD_GUILD_ID}/members/${discordUserId}`, {
    method: 'PUT',
    body: JSON.stringify({
      access_token: accessToken,
    }),
  });
}

/**
 * Add a user to the private channel by creating a permission overwrite
 */
export async function addUserToChannel(discordUserId: string) {
  return discordBotFetch(
    `/channels/${DISCORD_PRIVATE_CHANNEL_ID}/permissions/${discordUserId}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        allow: '1024', // VIEW_CHANNEL permission
        type: 1, // member type
      }),
    }
  );
}

/**
 * Remove a user's access to the private channel
 */
export async function removeUserFromChannel(discordUserId: string) {
  return discordBotFetch(
    `/channels/${DISCORD_PRIVATE_CHANNEL_ID}/permissions/${discordUserId}`,
    {
      method: 'DELETE',
    }
  );
}

/**
 * Kick a user from the guild entirely
 */
export async function kickUserFromGuild(discordUserId: string) {
  return discordBotFetch(
    `/guilds/${DISCORD_GUILD_ID}/members/${discordUserId}`,
    {
      method: 'DELETE',
    }
  );
}

/**
 * Get guild member info
 */
export async function getGuildMember(discordUserId: string) {
  try {
    return await discordBotFetch(
      `/guilds/${DISCORD_GUILD_ID}/members/${discordUserId}`
    );
  } catch {
    return null;
  }
}

/**
 * Exchange OAuth code for access token
 */
export async function exchangeCodeForToken(code: string) {
  const response = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID!,
      client_secret: process.env.DISCORD_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.DISCORD_REDIRECT_URI!,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Discord token exchange error: ${errorText}`);
    throw new Error('Failed to exchange Discord code for token');
  }

  return response.json();
}

/**
 * Get Discord user info from access token
 */
export async function getDiscordUser(accessToken: string) {
  const response = await fetch(`${DISCORD_API}/users/@me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get Discord user info');
  }

  return response.json();
}

/**
 * Build the Discord OAuth2 authorization URL
 */
export function getDiscordAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID!,
    redirect_uri: process.env.DISCORD_REDIRECT_URI!,
    response_type: 'code',
    scope: 'identify guilds.join',
    state,
  });

  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}
