import { cookies } from 'next/headers';
import type { UserRole } from '@prisma/client';
import { db } from './db';
import { decrypt, encrypt } from './jwt';
import { AuthenticationError, AppError } from './errors';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export const SESSION_COOKIE = 'session';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

// Smoke tests and CLI scripts run outside an HTTP request, where there is no cookie to read.
const TEST_SESSION: UserSession = { id: 'bdos-test-user', name: 'Test User', email: 'test@bdos.local', role: 'ADMIN' };

export class AuthService {
  /**
   * The signed-in user, loaded from the database on every call so a deactivated
   * account or a changed role takes effect immediately.
   */
  static async getCurrentUser(): Promise<UserSession | null> {
    let token: string | undefined;
    try {
      token = (await cookies()).get(SESSION_COOKIE)?.value;
    } catch {
      return process.env.NODE_ENV === 'test' ? TEST_SESSION : null;
    }
    if (!token) return null;

    const payload = await decrypt(token);
    if (!payload?.uid) return null;

    const user = await db.user.findUnique({
      where: { id: String(payload.uid) },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    if (!user || !user.isActive) return null;
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }

  static async isAuthenticated(): Promise<boolean> {
    const session = await this.getCurrentUser();
    return session !== null;
  }

  /**
   * Enforce session authorization guard for Server Actions.
   */
  static async verifySession(): Promise<UserSession> {
    const session = await this.getCurrentUser();
    if (!session) {
      throw new AuthenticationError('Your session has expired. Please sign in again.');
    }
    return session;
  }

  /** Like verifySession, but also requires one of the given roles. */
  static async requireRole(...roles: UserRole[]): Promise<UserSession> {
    const session = await this.verifySession();
    if (!roles.includes(session.role)) {
      throw new AppError('You do not have permission to do this.', 403, 'FORBIDDEN');
    }
    return session;
  }

  /** Signs the user in by setting the session cookie. */
  static async startSession(user: UserSession): Promise<void> {
    const expires = new Date(Date.now() + SESSION_TTL_MS);
    const token = await encrypt({ uid: user.id, email: user.email, name: user.name, role: user.role, expires: expires.getTime() });
    (await cookies()).set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires,
      sameSite: 'lax',
      path: '/',
    });
  }

  static async endSession(): Promise<void> {
    (await cookies()).set(SESSION_COOKIE, '', { httpOnly: true, expires: new Date(0), path: '/' });
  }
}

export const canManageTeam = (role: UserRole) => role === 'ADMIN';
export const canSeeAllDeals = (role: UserRole) => role === 'ADMIN' || role === 'MANAGER';
