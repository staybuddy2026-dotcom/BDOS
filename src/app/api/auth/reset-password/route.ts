import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { MIN_PASSWORD_LENGTH } from '@/lib/password';
import { verifyPasswordResetToken, resetPasswordWithToken } from '@/lib/passwordReset';

/**
 * GET: Verifies if a reset token is valid and active before displaying the password form.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ valid: false, error: 'Reset token is missing.' }, { status: 400 });
    }

    const check = await verifyPasswordResetToken(token);
    if (!check.valid) {
      return NextResponse.json({ valid: false, error: check.error }, { status: 400 });
    }

    return NextResponse.json(
      { valid: true, email: check.user.email, name: check.user.name },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Reset token verification error', error);
    return NextResponse.json(
      { valid: false, error: 'Could not verify reset token. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * POST: Updates the user's password using the verified reset token.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const token = String(body?.token || '').trim();
    const password = String(body?.password || '');

    if (!token) {
      return NextResponse.json({ error: 'Reset token is missing.' }, { status: 400 });
    }

    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.` },
        { status: 400 }
      );
    }

    const result = await resetPasswordWithToken(token, password);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to reset password.' }, { status: 400 });
    }

    return NextResponse.json(
      { success: true, message: 'Password has been reset successfully. You can now log in.' },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Reset password execution error', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while resetting your password. Please try again.' },
      { status: 500 }
    );
  }
}
