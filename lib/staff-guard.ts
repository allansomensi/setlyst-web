import "server-only";

import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import {
  hasStaffCapability,
  isStaffRole,
  type StaffCapability,
} from "@/lib/staff-permissions";
import { getSession } from "@/lib/server/session";

/**
 * Page guard for the staff console. Without a staff session the visitor
 * goes back to the dashboard; a staff member without `capability` (a
 * moderator on an admin-only page) goes to `fallback` instead. The API
 * enforces the same rules; this only avoids rendering a page of errors.
 */
export async function requireStaffPage(
  capability?: StaffCapability,
  fallback = "/dashboard",
) {
  const session = await getSession();
  const locale = await getLocale();
  if (!session || !isStaffRole(session.user.role)) {
    return redirect({ href: "/dashboard", locale });
  }
  if (capability && !hasStaffCapability(session.user.role, capability)) {
    return redirect({ href: fallback, locale });
  }
  const role = session.user.role;
  return {
    session,
    actor: { id: session.user.id, role },
    isAdmin: role === "admin",
    can: (cap: StaffCapability) => hasStaffCapability(role, cap),
  };
}
