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

const HAS_ZONE = /(Z|[+-]\d{2}:?\d{2})$/;

export function parseApiTimestamp(value: string): Date {
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

export function formatApiDateTime(
  value: string | null | undefined,
  locale: string,
): string {
  return formatApiDate(value, locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
