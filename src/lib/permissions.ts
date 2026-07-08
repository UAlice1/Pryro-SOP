/**
 * Role-based permission helpers.
 *
 * Roles (from low to high privilege):
 *   EMPLOYEE < MANAGER < ORG_ADMIN < SUPER_ADMIN
 *
 * Permission rules:
 *   - EMPLOYEE:    read SOPs, acknowledge, add comments
 *   - MANAGER:     + create/edit SOPs, approve/reject, request changes
 *   - ORG_ADMIN:   + manage departments/categories, manage users, publish SOPs
 *   - SUPER_ADMIN: all of the above + cross-org access
 */

export type UserRole = "SUPER_ADMIN" | "ORG_ADMIN" | "MANAGER" | "EMPLOYEE";

const ROLE_RANK: Record<UserRole, number> = {
  SUPER_ADMIN: 4,
  ORG_ADMIN:   3,
  MANAGER:     2,
  EMPLOYEE:    1,
};

function rank(role: string): number {
  return ROLE_RANK[role as UserRole] ?? 0;
}

/** Can the user create or edit SOPs? */
export function canEditSOPs(role: string): boolean {
  return rank(role) >= rank("MANAGER");
}

/** Can the user approve/reject SOPs in the approval workflow? */
export function canApprove(role: string): boolean {
  return rank(role) >= rank("MANAGER");
}

/** Can the user publish a SOP (approved → published)? */
export function canPublish(role: string): boolean {
  return rank(role) >= rank("ORG_ADMIN");
}

/** Can the user manage org structure (departments, categories, users)? */
export function canManageOrg(role: string): boolean {
  return rank(role) >= rank("ORG_ADMIN");
}

/** Can the user delete SOPs? */
export function canDeleteSOPs(role: string): boolean {
  return rank(role) >= rank("MANAGER");
}

/** Can the user view all SOPs in their org (not just their own)? */
export function canViewAllOrgSOPs(role: string): boolean {
  return rank(role) >= rank("MANAGER");
}

/** Can the user access AI generation features? */
export function canUseAI(role: string): boolean {
  return rank(role) >= rank("EMPLOYEE"); // all authenticated users
}

/** Simple object for use in API route checks */
export const Permission = {
  canEditSOPs,
  canApprove,
  canPublish,
  canManageOrg,
  canDeleteSOPs,
  canViewAllOrgSOPs,
  canUseAI,
} as const;
