import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { isValidEmail } from '@/lib/mailer';
import { generatePasswordResetToken, sendPasswordResetEmail } from '@/lib/passwordReset';

// Rate limiting: 5 requests per 15 minutes per email to mitigate spam/abuse
const MAX_REQUESTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const rateLimitMap = new Map<string, { count: number; first: number }>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const email = String(body?.email || '').trim().toLowerCase();

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    // Rate limiting check
    const now = Date.now();
    const entry = rateLimitMap.get(email);
    if (entry && now - entry.first > WINDOW_MS) {
      rateLimitMap.delete(email);
    }
    const current = rateLimitMap.get(email);
    if ((current?.count || 0) >= MAX_REQUESTS) {
      return NextResponse.json(
        { error: 'Too many password reset requests. Please try again in 15 minutes.' },
        { status: 429 }
      );
    }
    rateLimitMap.set(email, {
      count: (current?.count || 0) + 1,
      first: current?.first || now,
    });

    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, passwordHash: true, isActive: true },
    });

    let devResetUrl: string | undefined;

    if (user && user.isActive) {
      const token = await generatePasswordResetToken(user);
      const origin =
        request.headers.get('x-forwarded-proto') && request.headers.get('x-forwarded-host')
          ? `${request.headers.get('x-forwarded-proto')}://${request.headers.get('x-forwarded-host')}`
          : request.nextUrl.origin || 'http://localhost:3000';

      const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(token)}`;
      const result = await sendPasswordResetEmail(user.email, resetUrl, user.name);
      devResetUrl = result.devResetUrl;
    } else {
      // Delay response slightly to prevent timing enumeration attacks
      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    // Always return generic success to prevent account enumeration
    return NextResponse.json(
      {
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
        devResetUrl,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Forgot password endpoint error', error);
    return NextResponse.json(
      { error: 'Could not process password reset request. Please try again later.' },
      { status: 500 }
    );
  }
}
