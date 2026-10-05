import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AuthService } from '@/lib/auth';
import { verifyPassword } from '@/lib/password';
import { logger } from '@/lib/logger';

// Slows down password guessing: 8 failed attempts per email lock sign-in for 15 minutes.
const MAX_FAILURES = 8;
const LOCK_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; first: number }>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const attempt = failures.get(email);
    if (attempt && Date.now() - attempt.first > LOCK_MS) failures.delete(email);
    if ((failures.get(email)?.count || 0) >= MAX_FAILURES) {
      return NextResponse.json({ error: 'Too many failed attempts. Try again in 15 minutes.' }, { status: 429 });
    }

    const user = await db.user.findUnique({ where: { email } });
    const valid = !!user && user.isActive && (await verifyPassword(password, user.passwordHash));
    if (!user || !valid) {
      const current = failures.get(email);
      failures.set(email, { count: (current?.count || 0) + 1, first: current?.first || Date.now() });
      return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 });
    }

    failures.delete(email);
    await AuthService.startSession({ id: user.id, name: user.name, email: user.email, role: user.role });
    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error('Login failed', error);
    return NextResponse.json({ error: 'Could not sign you in. Please try again.' }, { status: 500 });
  }
}
