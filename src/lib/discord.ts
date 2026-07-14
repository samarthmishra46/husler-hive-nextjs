const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID!;
const DISCORD_PAID_ROLE_ID = process.env.DISCORD_PAID_ROLE_ID!;

const DISCORD_API = 'https://discord.com/api/v10';

/** Carries the HTTP status so callers can tell a 404 (definitive) from a 429/5xx (unknowable). */
export class DiscordApiError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(status: number, body: string) {
    super(`Discord API error: ${status}`);
    this.name = 'DiscordApiError';
    this.status = status;
    this.body = body;
  }
}

const MAX_ATTEMPTS = 3;

/**
 * Discord buckets every `/guilds/{guild}/members/*` call together, so a loop over
 * users hammers a single bucket. Serialize bot calls through one promise chain and
 * space them out — the 429 retry below is the backstop, not the plan.
 */
const MIN_CALL_SPACING_MS = 250;
let botCallChain: Promise<unknown> = Promise.resolve();
let lastCallAt = 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function throttle<T>(fn: () => Promise<T>): Promise<T> {
  const result = botCallChain.then(async () => {
    const waitFor = lastCallAt + MIN_CALL_SPACING_MS - Date.now();
    if (waitFor > 0) await sleep(waitFor);
    lastCallAt = Date.now();
    return fn();
  });
  // Keep the chain alive even if this call rejects, or every later call inherits the failure.
  botCallChain = result.catch(() => {});
  return result;
}

async function sendBotRequest(endpoint: string, options: RequestInit, attempt: number): Promise<Response> {
  return fetch(`${DISCORD_API}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  }).then(async (response) => {
    if (response.status === 429 && attempt < MAX_ATTEMPTS) {
      const body = await response.text();
      let retryAfter = 1;
      try {
        retryAfter = Number(JSON.parse(body).retry_after) || 1;
      } catch {
        retryAfter = Number(response.headers.get('retry-after')) || 1;
      }
      // Jitter so parallel instances don't resynchronize onto the same retry moment.
      await sleep(retryAfter * 1000 + Math.random() * 100);
      return sendBotRequest(endpoint, options, attempt + 1);
    }

    if (response.status >= 500 && attempt < MAX_ATTEMPTS) {
      await sleep(2 ** attempt * 500);
      return sendBotRequest(endpoint, options, attempt + 1);
    }

    return response;
  });
}

async function discordBotFetch(endpoint: string, options: RequestInit = {}) {
  const response = await throttle(() => sendBotRequest(endpoint, options, 1));

  if (!response.ok) {
    const errorText = await response.text();
    // A 404 on a member lookup is routine (they left the server) — not worth an
    // error line every night for every ex-member. Callers decide what it means.
    if (response.status !== 404) {
      console.error(`Discord API error: ${response.status} - ${errorText}`);
    }
    throw new DiscordApiError(response.status, errorText);
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
 * Add the paid member role to a user
 */
export async function addRoleToUser(discordUserId: string) {
  return discordBotFetch(
    `/guilds/${DISCORD_GUILD_ID}/members/${discordUserId}/roles/${DISCORD_PAID_ROLE_ID}`,
    {
      method: 'PUT',
    }
  );
}

/**
 * Remove the paid member role from a user
 */
export async function removeRoleFromUser(discordUserId: string) {
  return discordBotFetch(
    `/guilds/${DISCORD_GUILD_ID}/members/${discordUserId}/roles/${DISCORD_PAID_ROLE_ID}`,
    {
      method: 'DELETE',
    }
  );
}

/**
 * Get guild member info. Returns null ONLY for a 404 — i.e. Discord positively
 * confirmed this person is not in the guild. Any other failure (429, 5xx, network)
 * throws, because "we couldn't reach Discord" is not the same fact as "they left",
 * and callers that revoke access must never conflate the two.
 */
export async function getGuildMember(discordUserId: string) {
  try {
    return await discordBotFetch(
      `/guilds/${DISCORD_GUILD_ID}/members/${discordUserId}`
    );
  } catch (err) {
    if (err instanceof DiscordApiError && err.status === 404) return null;
    throw err;
  }
}

export type PaidRoleState = 'has-role' | 'no-role' | 'not-member' | 'unknown';

/**
 * Live paid-role state, straight from Discord.
 *  'has-role'   → in the guild, still holds the paid role
 *  'no-role'    → in the guild, role already gone — nothing to do
 *  'not-member' → Discord confirmed they left the guild — nothing to do
 *  'unknown'    → Discord could not be reached (rate limit exhausted, 5xx, network)
 *
 * Treat 'unknown' as "try again next run", NEVER as "no access": acting on it would
 * mark a paying-then-lapsed member as revoked while they still hold the role.
 *
 * Removing the paid role does NOT remove the person from the guild, so
 * `getGuildMember` keeps returning them forever. Callers that revoke access must
 * key off the role itself, not off guild membership, or they will re-revoke (and
 * re-log) the same user on every run.
 */
export async function getPaidRoleState(discordUserId: string): Promise<PaidRoleState> {
  let member: { roles?: string[] } | null;
  try {
    member = (await getGuildMember(discordUserId)) as { roles?: string[] } | null;
  } catch (err) {
    console.error(`Could not determine paid-role state for ${discordUserId}:`, err);
    return 'unknown';
  }

  if (!member) return 'not-member';
  return Array.isArray(member.roles) && member.roles.includes(DISCORD_PAID_ROLE_ID)
    ? 'has-role'
    : 'no-role';
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
