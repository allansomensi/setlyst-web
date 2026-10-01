/**
 * What maintenance mode and closed sign-ups mean for the screens regular
 * people see: the dashboard's banner or full-page screen, the sign-in
 * notice and the sign-up page. The switches themselves live in the
 * staff console (`/dashboard/admin/platform`); the API enforces them.
 *
 * Pure (no Next.js imports), shared by server components and unit tested.
 */

import { parseApiTimestamp } from "@/lib/dates";
import {
  MAINTENANCE_MODES,
  type MaintenanceMode,
  type MaintenanceSettings,
  type PublicPlatformStatus,
} from "@/types/operations";

/** Where staff turn maintenance on and off. */
export const PLATFORM_SETTINGS_PATH = "/dashboard/admin/platform";

/** Longest staff message shown (the API caps it at 500 characters). */
const MAX_MESSAGE_LENGTH = 500;

/** A naive UTC timestamp, the only shape `ends_at` may have. */
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?Z?$/;

export function isMaintenanceMode(value: unknown): value is MaintenanceMode {
  return (
    typeof value === "string" &&
    (MAINTENANCE_MODES as readonly string[]).includes(value)
  );
}

export function isStaffRole(role: string | null | undefined): boolean {
  return role === "admin" || role === "moderator";
}

function cleanMessage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, MAX_MESSAGE_LENGTH) : null;
}

function cleanTimestamp(value: unknown): string | null {
  return typeof value === "string" && TIMESTAMP.test(value) ? value : null;
}

function parseMaintenance(value: unknown): MaintenanceSettings | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  if (!isMaintenanceMode(source.mode)) return null;
  return {
    mode: source.mode,
    message: cleanMessage(source.message),
    ends_at: cleanTimestamp(source.ends_at),
    started_at: cleanTimestamp(source.started_at),
  };
}

/**
 * `GET /public/platform`, checked field by field: anything malformed
 * answers `null`, like an unreachable API (the screens then show nothing
 * special and the API still refuses what it must).
 */
export function parsePlatformStatus(
  value: unknown,
): PublicPlatformStatus | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const maintenance = parseMaintenance(source.maintenance);
  if (!maintenance || typeof source.registrations_open !== "boolean") {
    return null;
  }
  return { maintenance, registrations_open: source.registrations_open };
}

/**
 * The maintenance described by an API error, or `null` when it isn't a
 * `MAINTENANCE_MODE` refusal. Takes anything with `code` and `meta`
 * (an `ApiError`, a sign-in failure, a server action's result). A
 * refusal without a usable `meta.mode` means the platform is closed.
 */
export function maintenanceFromError(
  error: unknown,
): MaintenanceSettings | null {
  if (!error || typeof error !== "object") return null;
  const { code, meta } = error as { code?: unknown; meta?: unknown };
  if (code !== "MAINTENANCE_MODE") return null;
  const source =
    meta && typeof meta === "object" ? (meta as Record<string, unknown>) : {};
  return {
    mode: isMaintenanceMode(source.mode) ? source.mode : "full",
    message: cleanMessage(source.message),
    ends_at: cleanTimestamp(source.ends_at),
    started_at: null,
  };
}

/**
 * The maintenance in force: an API refusal is fresher than the cached
 * public status (which can lag by a few seconds), so it wins.
 */
export function resolveMaintenance(
  status: MaintenanceSettings | null | undefined,
  refusal: MaintenanceSettings | null | undefined,
): MaintenanceSettings | null {
  if (refusal && refusal.mode !== "off") return refusal;
  if (status && status.mode !== "off") return status;
  return null;
}

/**
 * What the dashboard shows for `mode`:
 *
 * - `none`: the platform is open;
 * - `staff`: a reminder that maintenance is on for everyone else (staff,
 *   and staff viewing as someone, are never affected);
 * - `readOnly`: a banner saying changes are paused;
 * - `screen`: the full-page maintenance screen instead of the dashboard.
 */
export type MaintenanceView = "none" | "staff" | "readOnly" | "screen";

export function maintenanceView(
  mode: MaintenanceMode | null | undefined,
  staff: boolean,
): MaintenanceView {
  if (!mode || mode === "off") return "none";
  if (staff) return "staff";
  return mode === "read_only" ? "readOnly" : "screen";
}

/**
 * The sign-up page's state: `maintenance` while any maintenance is on,
 * `closed` while sign-ups are switched off. When the status couldn't be
 * read the form is shown: the API still refuses, and the form says so.
 */
export type SignUpState = "open" | "closed" | "maintenance";

export function signUpState(
  status: PublicPlatformStatus | null | undefined,
): SignUpState {
  if (!status) return "open";
  if (status.maintenance.mode !== "off") return "maintenance";
  return status.registrations_open ? "open" : "closed";
}

/** Whether the sign-in page warns that only staff can sign in. */
export function signInRestricted(
  status: PublicPlatformStatus | null | undefined,
): boolean {
  return status?.maintenance.mode === "full";
}

/**
 * `ends_at` when it is still ahead of `now`: a past estimate ("expected
 * back at 14:00" at 15:30) says nothing useful.
 */
export function expectedEnd(
  maintenance: Pick<MaintenanceSettings, "ends_at"> | null | undefined,
  now: number = Date.now(),
): string | null {
  const endsAt = maintenance?.ends_at;
  if (!endsAt) return null;
  const time = parseApiTimestamp(endsAt).getTime();
  return Number.isNaN(time) || time <= now ? null : endsAt;
}
