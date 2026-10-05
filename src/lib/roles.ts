import type { UserRole } from '@prisma/client';

/** Role rules shared by server actions and client components. */
export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Sales Manager',
  BDE: 'Business Development Executive',
};

/** Admins add, edit and deactivate team members. */
export const canManageTeam = (role: UserRole) => role === 'ADMIN';

/** Admins and managers see every deal; a BDE sees their own deals plus the unassigned pool. */
export const canSeeAllDeals = (role: UserRole) => role === 'ADMIN' || role === 'MANAGER';
