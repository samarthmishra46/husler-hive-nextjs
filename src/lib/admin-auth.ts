import { cookies } from 'next/headers';
import crypto from 'crypto';
import dbConnect from '@/lib/mongodb';
import AdminSession from '@/models/AdminSession';

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

// MongoDB-backed session store (works with Vercel serverless)
export async function createSession(token: string) {
  await dbConnect();
  const hashed = hashToken(token);
  await AdminSession.findOneAndUpdate(
    { hashedToken: hashed },
    {
      hashedToken: hashed,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    { upsert: true }
  );
}

export async function validateSession(token: string): Promise<boolean> {
  await dbConnect();
  const hashed = hashToken(token);
  const session = await AdminSession.findOne({
    hashedToken: hashed,
    expiresAt: { $gt: new Date() },
  });
  return !!session;
}

export async function clearSession(token: string) {
  await dbConnect();
  const hashed = hashToken(token);
  await AdminSession.deleteOne({ hashedToken: hashed });
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const token = await getAdminCookie();
  if (!token) return false;
  return validateSession(token);
}
