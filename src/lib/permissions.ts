/**
 * Role-based permission helpers.
 *
 * Role hierarchy (low → high privilege):
 *   EMPLOYEE < EDITOR < APPROVER < MANAGER < ORG_ADMIN < SUPER_ADMIN
 *
 * Permission matrix:
 * ┌──────────────────────────────┬──────────┬────────┬──────────┬─────────┬──────────┬─────────────┐
 * │ Permission                   │ EMPLOYEE │ EDITOR │ APPROVER │ MANAGER │ ORG_ADMIN│ SUPER_ADMIN │
 * ├──────────────────────────────┼──────────┼────────┼──────────┼─────────┼──────────┼─────────────┤
 * │ View own SOPs                │    ✓     │   ✓    │    ✓     │    ✓    │    ✓     │      ✓      │
 * │ View all org SOPs            │          │   ✓    │    ✓     │    ✓    │    ✓     │      ✓      │
 * │ Create SOPs                  │          │        │          │    ✓    │    ✓     │      ✓      │
 * │ Edit SOPs                    │          │   ✓    │          │    ✓    │    ✓     │      ✓      │
 * │ Delete SOPs                  │          │        │          │    ✓    │    ✓     │      ✓      │
 * │ Approve/reject SOPs          │          │        │    ✓     │    ✓    │    ✓     │      ✓      │
 * │ Publish SOPs                 │          │        │          │         │    ✓     │      ✓      │
 * │ Manage org (depts/cats/users)│          │        │          │         │    ✓     │      ✓      │
 * │ Acknowledge SOPs             │    ✓     │   ✓    │    ✓     │    ✓    │    ✓     │      ✓      │
 * │ Comment on SOPs              │    ✓     │   ✓    │    ✓     │    ✓    │    ✓     │      ✓      │
 * │ Use AI features              │    ✓     │   ✓    │    ✓     │    ✓    │    ✓     │      ✓      │
 * │ Invite staff                 │          │        │          │    ✓    │    ✓     │      ✓      │
 * └──────────────────────────────┴──────────┴────────┴──────────┴─────────┴──────────┴─────────────┘
 */

export type UserRole =
  | "SUPER_ADMIN"
  | "ORG_ADMIN"
  | "MANAGER"
  | "APPROVER"
  | "EDITOR"
  | "EMPLOYEE";

const ROLE_RANK: Record<UserRole, number> = {
  SUPER_ADMIN: 6,
  ORG_ADMIN:   5,
  MANAGER:     4,
  APPROVER:    3,
  EDITOR:      2,
  EMPLOYEE:    1,
};

function rank(role: string): number {
  return ROLE_RANK[role as UserRole] ?? 0;
}

function atLeast(role: string, minimum: UserRole): boolean {
  return rank(role) >= rank(minimum);
}

// ── SOP access ──────────────────────────────────────────────────────────────

/** Can see all SOPs in their org (not just their own). */
export function canViewAllOrgSOPs(role: string): boolean {
  return atLeast(role, "EDITOR");
}

/** Can create new SOPs. */
export function canCreateSOPs(role: string): boolean {
  return atLeast(role, "MANAGER");
}

/**
 * Can edit SOP content (sections, workflow, checklist, metadata).
 * EDITOR can edit any SOP; MANAGER+ can also create and delete.
 */
export function canEditSOPs(role: string): boolean {
  return atLeast(role, "EDITOR");
}

/** Can delete SOPs (soft delete). */
export function canDeleteSOPs(role: string): boolean {
  return atLeast(role, "MANAGER");
}

// ── Approval workflow ────────────────────────────────────────────────────────

/** Can submit a SOP for review (author only — checked separately). */
export function canSubmitForReview(role: string): boolean {
  return atLeast(role, "MANAGER");
}

/** Can approve or reject SOPs in the review queue. */
export function canApprove(role: string): boolean {
  return atLeast(role, "APPROVER");
}

/** Can publish a SOP (approved → published). */
export function canPublish(role: string): boolean {
  return atLeast(role, "ORG_ADMIN");
}

// ── Org management ───────────────────────────────────────────────────────────

/** Can manage org structure: departments, categories, users, settings. */
export function canManageOrg(role: string): boolean {
  return atLeast(role, "ORG_ADMIN");
}

/** Can invite staff to SOPs via email. */
export function canInviteStaff(role: string): boolean {
  return atLeast(role, "MANAGER");
}

// ── General ──────────────────────────────────────────────────────────────────

/** Can acknowledge a SOP (all authenticated users). */
export function canAcknowledge(role: string): boolean {
  return atLeast(role, "EMPLOYEE");
}

/** Can post comments on a SOP (all authenticated users). */
export function canComment(role: string): boolean {
  return atLeast(role, "EMPLOYEE");
}

/** Can use AI generation and assistant features (all authenticated users). */
export function canUseAI(role: string): boolean {
  return atLeast(role, "EMPLOYEE");
}

// ── Convenience label map ────────────────────────────────────────────────────

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ORG_ADMIN:   "Org Admin",
  MANAGER:     "Manager",
  APPROVER:    "Approver",
  EDITOR:      "Editor",
  EMPLOYEE:    "Employee",
};

/** Roles that can be assigned by an ORG_ADMIN in the admin panel. */
export const ASSIGNABLE_ROLES: UserRole[] = [
  "MANAGER",
  "APPROVER",
  "EDITOR",
  "EMPLOYEE",
];

/** Single object for use in API route guards. */
export const Permission = {
  canViewAllOrgSOPs,
  canCreateSOPs,
  canEditSOPs,
  canDeleteSOPs,
  canSubmitForReview,
  canApprove,
  canPublish,
  canManageOrg,
  canInviteStaff,
  canAcknowledge,
  canComment,
  canUseAI,
} as const;
