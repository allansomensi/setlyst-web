/**
 * Client-side mirror of the API's staff hierarchy
 * (`setlyst-api/src/controllers/user.rs`, `Role::outranks`). Used only to
 * decide which controls to show — the API re-checks everything.
 *
 * - Staff manage accounts strictly below their own rank: moderators manage
 *   regular users; admins manage users and moderators.
 * - Nobody manages their own account from the staff console.
 * - Only admins change platform roles, and never another admin's (or
 *   their own): demoting an admin is a server-side operation
 *   (`create_superuser --demote`).
 * - Deleting an account, setting a temporary password, changing its
 *   e-mail and viewing as it are admin-only; moderators keep suspension,
 *   deactivation, sign-out and names.
 */

import type { UserRole } from "@/types/api";

const RANK: Record<UserRole, number> = { user: 0, moderator: 1, admin: 2 };

export function roleRank(role: UserRole): number {
  return RANK[role] ?? 0;
}

export function isStaffRole(role: UserRole | null | undefined): boolean {
  return role === "admin" || role === "moderator";
}

export function outranks(actor: UserRole, target: UserRole): boolean {
  return roleRank(actor) > roleRank(target);
}

export interface StaffActor {
  id: string;
  role: UserRole;
}

export type StaffTarget = StaffActor;

/** Edit, ban, deactivate, reset password, sign out, delete, view as. */
export function canManageUser(actor: StaffActor, target: StaffTarget): boolean {
  return actor.id !== target.id && outranks(actor.role, target.role);
}

export function canChangeRole(actor: StaffActor, target: StaffTarget): boolean {
  return (
    actor.role === "admin" && actor.id !== target.id && target.role !== "admin"
  );
}

/**
 * The admin-only account operations: delete, temporary password, e-mail
 * change, view as. The target must still rank below the actor.
 */
export function canAdministerUser(
  actor: StaffActor,
  target: StaffTarget,
): boolean {
  return actor.role === "admin" && canManageUser(actor, target);
}

/** Roles `actor` may give when creating an account. */
export function assignableRoles(actor: UserRole): UserRole[] {
  if (actor === "admin") return ["user", "moderator", "admin"];
  if (actor === "moderator") return ["user"];
  return [];
}

/**
 * What each staff role can reach in the console, mirroring the API's
 * `require_staff` / `require_admin` checks. Capabilities ending in
 * `.write` gate changes; the others gate seeing a screen at all.
 *
 * Moderators review: users, the moderation queue, content and public
 * links; they draft announcements, and read release notes, the billing
 * overview and the default limits. Everything else (the audit log, plans,
 * billing settings, the finance report, promo codes, promotions,
 * publishing announcements or e-mailing them, release-note edits, limit
 * edits, rescans) is admin-only.
 */
export type StaffCapability =
  | "users"
  | "moderation"
  | "moderation.rescan"
  | "audit"
  | "announcements"
  | "announcements.publish"
  | "releaseNotes"
  | "releaseNotes.write"
  | "billing"
  | "billing.write"
  | "finance"
  | "promoCodes"
  | "promotions"
  | "content"
  | "content.write"
  | "limits"
  | "limits.write";

const ADMIN_ONLY: ReadonlySet<StaffCapability> = new Set<StaffCapability>([
  "moderation.rescan",
  "audit",
  "announcements.publish",
  "releaseNotes.write",
  "billing.write",
  "finance",
  "promoCodes",
  "promotions",
  "content.write",
  "limits.write",
]);

export function hasStaffCapability(
  role: UserRole | null | undefined,
  capability: StaffCapability,
): boolean {
  if (role === "admin") return true;
  if (role === "moderator") return !ADMIN_ONLY.has(capability);
  return false;
}
