/**
 * Day ranges for list filters (`?from=2026-09-01&to=2026-09-30`): whole
 * days in the viewer's calendar, both ends included, turned into the
 * API's naive UTC timestamps (lib/dates.ts) at the viewer's time zone.
 */

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}

/** A `YYYY-MM-DD` day that exists, or null (hand-edited URLs included). */
export function parseDay(value: string | null | undefined): string | null {
  const match = value ? DAY.exec(value.trim()) : null;
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }
  return `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
}

/** A local `Date` as `YYYY-MM-DD` (its day in the browser's zone). */
export function toDay(date: Date): string {
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `YYYY-MM-DD` as a local `Date` at midnight (for the calendar). */
export function fromDay(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Milliseconds `timeZone` is ahead of UTC at `instant`. */
function zoneOffset(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** The instant a day starts in `timeZone`, as a naive UTC timestamp. */
export function dayStartUtc(day: string, timeZone: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const wall = Date.UTC(y, m - 1, d);
  // Twice: the offset at the guess can differ from the one at the answer
  // when a daylight-saving change falls in between.
  let instant = wall - zoneOffset(wall, timeZone);
  instant = wall - zoneOffset(instant, timeZone);
  return new Date(instant).toISOString().slice(0, 19);
}

/** The day after `day`. */
export function nextDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/**
 * The API bounds of a day range: `from` is the start of the first day,
 * `to` the start of the day after the last (exclusive). Ends given in the
 * wrong order are swapped; a missing end leaves that side open.
 */
export function dayRangeToUtc(
  rawFrom: string | null | undefined,
  rawTo: string | null | undefined,
  timeZone: string,
): { from: string | null; to: string | null } {
  let from = parseDay(rawFrom);
  let to = parseDay(rawTo);
  if (from && to && from > to) [from, to] = [to, from];
  return {
    from: from ? dayStartUtc(from, timeZone) : null,
    to: to ? dayStartUtc(nextDay(to), timeZone) : null,
  };
}
