import { cookies } from 'next/headers';
import crypto from 'crypto';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!;
const SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret';

const COOKIE_NAME = 'admin_session';

export function validateAdminCredentials(email: string, password: string): boolean {
  return email === ADMIN_EMAIL && password === ADMIN_PASSWORD;
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHmac('sha256', SECRET).update(token).digest('hex');
}

export async function setAdminCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
}

export async function getAdminCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  return cookie?.value || null;
}

export async function clearAdminCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Simple in-memory session store (in production use Redis or DB)
const sessions = new Map<string, { hashedToken: string; expiresAt: number }>();

export function createSession(token: string) {
  const hashed = hashToken(token);
  sessions.set(hashed, {
    hashedToken: hashed,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  });
}

export function validateSession(token: string): boolean {
  const hashed = hashToken(token);
  const session = sessions.get(hashed);
  if (!session) return false;
  if (Date.now() > session.expiresAt) {
    sessions.delete(hashed);
    return false;
  }
  return true;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const token = await getAdminCookie();
  if (!token) return false;
  return validateSession(token);
}
