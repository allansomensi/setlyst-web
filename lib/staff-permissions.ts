/**
 * Client-side mirror of the API's staff hierarchy
 * (`setlyst-api/src/controllers/user.rs`, `Role::outranks`). Used only to
 * decide which controls to show — the API re-checks everything.
 *
 * - Staff manage accounts strictly below their own rank: moderators manage
 *   regular users; admins manage users and moderators.
 * - Nobody manages their own account from the staff console.
 * - Only admins change platform roles. An admin may also demote a fellow
 *   admin (never themselves), as long as another active admin remains.
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
  return actor.role === "admin" && actor.id !== target.id;
}

/** Roles `actor` may give when creating an account. */
export function assignableRoles(actor: UserRole): UserRole[] {
  if (actor === "admin") return ["user", "moderator", "admin"];
  if (actor === "moderator") return ["user"];
  return [];
}
