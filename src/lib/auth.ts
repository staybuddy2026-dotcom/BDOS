
export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: string;
}

export class AuthService {
  /**
   * Get current authenticated user session.
   * Since this is a personal app run locally, we default to the active owner session.
   */
  static async getCurrentUser(): Promise<UserSession | null> {
    // Return mock active user session
    return {
      id: 'bdos-user-admin-uuid',
      name: 'Akash',
      email: 'akash@tinyscript.in',
      role: 'Business Owner',
    };
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
      throw new Error('Unauthorized: Valid user session required to execute action.');
    }
    return session;
  }
}
