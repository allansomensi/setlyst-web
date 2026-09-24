/**
 * Date helpers for API timestamps.
 *
 * The API serializes server-generated timestamps (`created_at`,
 * `updated_at`, `last_login_at`, `banned_until`...) as *naive UTC* —
 * `"2026-09-22T21:31:00.123456"`, with no `Z`. `new Date()` reads such a
 * string as *local* time, which silently shifted every one of them by the
 * viewer's UTC offset (three hours in Brazil). Always parse them here.
 *
 * Gig `scheduled_at` is different: it's a wall-clock time chosen by the
 * user, stored and shown as-is, so it must NOT go through this.
 */

const HAS_ZONE = /(Z|[+-]\d{2}:?\d{2})$/i;

/**
 * The zone dates are shown in when the viewer's is unknown (a first
 * visit, before the browser reported its own): the primary market's.
 */
export const DEFAULT_TIME_ZONE = "America/Sao_Paulo";

/** Cookie holding the browser's IANA time zone (see TimeZoneCookie). */
export const TIME_ZONE_COOKIE = "tz";

/**
 * `value` when it is an IANA time zone this runtime knows, otherwise null.
 * Cookie input, so length and characters are checked before `Intl` sees it.
 */
export function validTimeZone(value: string | null | undefined): string | null {
  if (typeof value !== "string" || value.length > 64) return null;
  if (!/^[A-Za-z0-9_+\-/]+$/.test(value)) return null;
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: value,
    }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
}
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A naive UTC timestamp (or one with a zone) as a Date. A plain
 * `YYYY-MM-DD` date is read as midnight UTC: format it with
 * `formatApiDay`, which stays in UTC so the day never shifts.
 */
export function parseApiTimestamp(value: string): Date {
  if (DATE_ONLY.test(value)) return new Date(`${value}T00:00:00Z`);
  return new Date(HAS_ZONE.test(value) ? value : `${value}Z`);
}

export function formatApiDate(
  value: string | null | undefined,
  locale: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  if (!value) return "";
  const date = parseApiTimestamp(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, options).format(date);
}

/**
 * A calendar day from the API (`YYYY-MM-DD`: release dates, legal
 * versions, activity buckets), formatted in UTC so it shows the same day
 * in every time zone.
 */
export function formatApiDay(
  value: string | null | undefined,
  locale: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "long" },
): string {
  return formatApiDate(value, locale, { ...options, timeZone: "UTC" });
}

/**
 * Date and time of a server timestamp. Pass `timeZone` wherever the code
 * may run on the server (server components, server actions): the server's
 * own zone is UTC and would be hours off for the viewer. Server code gets
 * it from next-intl (`getTimeZone()` / `useTimeZone()`), which reads the
 * viewer's zone from the `tz` cookie (i18n/request.ts).
 */
export function formatApiDateTime(
  value: string | null | undefined,
  locale: string,
  timeZone?: string,
): string {
  return formatApiDate(value, locale, {
    dateStyle: "medium",
    timeStyle: "short",
    ...(timeZone ? { timeZone } : {}),
  });
}

/**
 * A gig's `scheduled_at` ("2026-10-03T21:00:00"): the wall-clock time at
 * the venue, as typed. Read and formatted in UTC on purpose, so
 * "21:00" shows as 21:00 on the server, in every browser and in every
 * time zone (and server and client render the same text).
 */
export function parseWallClock(value: string): Date {
  const naive = value.replace(HAS_ZONE, "");
  return new Date(`${naive}Z`);
}

export function formatWallClock(
  value: string | null | undefined,
  locale: string,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  },
): string {
  if (!value) return "";
  const date = parseWallClock(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: "UTC",
  }).format(date);
}

/**
 * "Now" on the same scale as `parseWallClock`: the viewer's local clock
 * reading, as if it were UTC. Browser-only in practice (on the server it
 * is the server's clock), so call it after mount.
 */
export function wallClockNow(): number {
  const now = new Date();
  return now.getTime() - now.getTimezoneOffset() * 60_000;
}
