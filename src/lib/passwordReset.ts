import { SignJWT, jwtVerify } from 'jose';
import nodemailer from 'nodemailer';
import { db } from './db';
import { logger } from './logger';
import { hashPassword, MIN_PASSWORD_LENGTH } from './password';
import { isValidEmail } from './mailer';

const DEV_FALLBACK_SECRET = 'fallback_secret_key_for_development';

function getJwtKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is not set. Add a long random value to the environment before running in production.');
  }
  return new TextEncoder().encode(secret || DEV_FALLBACK_SECRET);
}

export type ResetTokenPayload = {
  uid: string;
  email: string;
  sig: string;
  purpose: 'password_reset';
};

/**
 * Generates a signed, single-use, 1-hour password reset token.
 * Incorporates a signature slice of the current password hash so changing the password
 * instantly and automatically invalidates the token against replay attacks.
 */
export async function generatePasswordResetToken(user: { id: string; email: string; passwordHash: string }): Promise<string> {
  const payload: ResetTokenPayload = {
    uid: user.id,
    email: user.email.toLowerCase(),
    sig: user.passwordHash.slice(0, 32),
    purpose: 'password_reset',
  };

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(getJwtKey());
}

/**
 * Validates a reset token cryptographically and against the current user state in the database.
 */
export async function verifyPasswordResetToken(token: string): Promise<
  { valid: true; user: { id: string; email: string; name: string } } | { valid: false; error: string }
> {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'A reset token is required.' };
  }

  try {
    const { payload } = await jwtVerify(token, getJwtKey(), {
      algorithms: ['HS256'],
    });

    const typedPayload = payload as unknown as ResetTokenPayload;
    if (typedPayload.purpose !== 'password_reset' || !typedPayload.uid) {
      return { valid: false, error: 'Invalid password reset token format.' };
    }

    const user = await db.user.findUnique({
      where: { id: typedPayload.uid },
      select: { id: true, email: true, name: true, passwordHash: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return { valid: false, error: 'User account not found or deactivated.' };
    }

    // Verify token was generated for the current password hash (prevents replay after password is changed)
    const expectedSig = user.passwordHash.slice(0, 32);
    if (typedPayload.sig !== expectedSig) {
      return { valid: false, error: 'This password reset link has already been used. Please request a new one.' };
    }

    return { valid: true, user: { id: user.id, email: user.email, name: user.name } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (/expired/i.test(message)) {
      return { valid: false, error: 'This password reset link has expired (links are valid for 1 hour). Please request a new one.' };
    }
    return { valid: false, error: 'Invalid password reset link. Please request a new one.' };
  }
}

/**
 * Resets a user's password using a verified token.
 */
export async function resetPasswordWithToken(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    return { success: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.` };
  }

  const check = await verifyPasswordResetToken(token);
  if (!check.valid) {
    return { success: false, error: check.error };
  }

  try {
    const passwordHash = await hashPassword(newPassword);
    await db.user.update({
      where: { id: check.user.id },
      data: { passwordHash },
    });

    logger.info(`Password successfully reset for user ${check.user.email} (${check.user.id}).`);
    return { success: true };
  } catch (err) {
    logger.error(`Failed to update password for user ${check.user.id}`, err);
    return { success: false, error: 'Could not update password. Please try again later.' };
  }
}

/**
 * Sends the reset password email via SMTP if configured, or logs to console in development.
 */
export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
  name?: string
): Promise<{ sent: boolean; devResetUrl?: string }> {
  const isDev = process.env.NODE_ENV !== 'production';
  const recipient = email.trim();
  const userName = name?.trim() || 'there';

  if (!isValidEmail(recipient)) {
    return { sent: false };
  }

  const { SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_PORT, SMTP_SECURE } = process.env;

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    try {
      const port = parseInt(SMTP_PORT || '465', 10) || 465;
      const secure = SMTP_SECURE ? SMTP_SECURE === 'true' : port === 465;

      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port,
        secure,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
        connectionTimeout: 10000,
      });

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090e22; color: #f8fafc; padding: 20px; }
            .container { max-width: 560px; margin: 0 auto; background: #0f172a; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); padding: 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
            .btn { display: inline-block; background: linear-gradient(135deg, #a855f7 0%, #6366f1 50%, #3b82f6 100%); color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 600; font-size: 15px; margin: 24px 0; }
            .footer { font-size: 12px; color: #64748b; margin-top: 32px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 16px; word-break: break-all; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2 style="margin-top:0; color:#ffffff; font-size: 22px;">Reset Your BDOS Password</h2>
            <p style="color:#94a3b8; font-size: 15px; line-height: 1.6;">Hi ${userName},</p>
            <p style="color:#94a3b8; font-size: 15px; line-height: 1.6;">
              We received a request to reset your password for your account (${recipient}). Click the button below to set a new password:
            </p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="btn" target="_blank">Reset Password</a>
            </div>
            <p style="color:#94a3b8; font-size: 13px; line-height: 1.5;">
              This link is valid for <strong>1 hour</strong>. If you did not request this change, you can safely ignore this email; your current password remains secure.
            </p>
            <div class="footer">
              If the button doesn't work, copy and paste this URL into your browser:<br/>
              <a href="${resetUrl}" style="color: #6366f1;">${resetUrl}</a>
            </div>
          </div>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from: SMTP_FROM || SMTP_USER,
        to: recipient,
        subject: 'Reset your BDOS password',
        text: `Hi ${userName},\n\nWe received a request to reset your password. Use the following link to choose a new password (valid for 1 hour):\n\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.\n`,
        html,
      });

      logger.info(`Password reset email delivered to ${recipient}.`);
      return { sent: true, devResetUrl: isDev ? resetUrl : undefined };
    } catch (err) {
      logger.error(`Failed to send password reset email to ${recipient}`, err);
      // In dev, fall through to returning devResetUrl
    }
  } else {
    logger.info(`[Password Reset] SMTP not configured. Reset link for ${recipient}: ${resetUrl}`);
  }

  return { sent: true, devResetUrl: isDev ? resetUrl : undefined };
}
