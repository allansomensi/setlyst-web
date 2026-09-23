/**
 * Conversions between `<input type="datetime-local">` values, which are in
 * the viewer's own time zone (`2026-10-01T21:30`), and the API's naive UTC
 * timestamps (`2026-10-02T00:30:00`, no offset; see lib/dates.ts).
 *
 * Used by every staff form with a schedule (announcements, promo codes,
 * promotions): staff type local times, the API stores UTC.
 */

import { parseApiTimestamp } from "@/lib/dates";

const LOCAL_INPUT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

function pad(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}

/**
 * A `datetime-local` value (local time) as a naive UTC timestamp
 * (`YYYY-MM-DDTHH:MM:SS`). Empty or malformed input → `null`.
 */
export function localInputToUtcNaive(
  value: string | null | undefined,
): string | null {
  const match = value ? LOCAL_INPUT.exec(value.trim()) : null;
  if (!match) return null;
  const [, y, mo, d, h, mi, s] = match;
  const date = new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    Number(s ?? 0),
  );
  if (Number.isNaN(date.getTime())) return null;
  return (
    `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-` +
    `${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:` +
    `${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
  );
}

/**
 * A naive UTC timestamp from the API as a `datetime-local` value in the
 * viewer's time zone (`YYYY-MM-DDTHH:MM`). `null`/malformed → `""`.
 */
export function utcNaiveToLocalInput(value: string | null | undefined): string {
  if (!value) return "";
  const date = parseApiTimestamp(value);
  if (Number.isNaN(date.getTime())) return "";
  return (
    `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-` +
    `${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** "Now" plus `minutes`, as a `datetime-local` value (local time). */
export function localInputFromNow(minutes = 0, now = new Date()): string {
  const date = new Date(now.getTime() + minutes * 60_000);
  return (
    `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-` +
    `${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** Whether naive UTC `a` is strictly before `b` (both required). */
export function isBeforeUtc(a: string, b: string): boolean {
  return parseApiTimestamp(a).getTime() < parseApiTimestamp(b).getTime();
}
