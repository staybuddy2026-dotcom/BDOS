import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AuthService } from '@/lib/auth';
import { hashPassword, MIN_PASSWORD_LENGTH } from '@/lib/password';
import { isValidEmail } from '@/lib/mailer';
import { logger } from '@/lib/logger';

/** Tells the sign-in page whether the workspace still needs its first (admin) account. */
export async function GET() {
  try {
    return NextResponse.json({ needsSetup: (await db.user.count()) === 0 });
  } catch (error) {
    logger.error('Could not read workspace setup status', error);
    return NextResponse.json({ needsSetup: false, error: 'Database is not reachable.' }, { status: 500 });
  }
}

/**
 * First-run setup only: creates the workspace admin. Once a user exists, new team
 * members are added by an admin on the Team page, so public sign-up stays closed.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    const name = String(body?.name || '').trim();

    if (!name || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Enter your name and a valid email address.' }, { status: 400 });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json({ error: `Use a password of at least ${MIN_PASSWORD_LENGTH} characters.` }, { status: 400 });
    }
    if ((await db.user.count()) > 0) {
      return NextResponse.json({ error: 'This workspace is already set up. Ask your admin to add you on the Team page.' }, { status: 403 });
    }

    const user = await db.user.create({
      data: { email, name, passwordHash: await hashPassword(password), role: 'ADMIN', lastLoginAt: new Date() },
    });
    await AuthService.startSession({ id: user.id, name: user.name, email: user.email, role: user.role });
    logger.info(`Workspace admin account created for ${email}.`);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    logger.error('Workspace setup failed', error);
    return NextResponse.json({ error: 'Could not create the account. Please try again.' }, { status: 500 });
  }
}
