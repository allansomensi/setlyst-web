/**
 * iCalendar (.ics, RFC 5545) for a gig, for "Add to calendar".
 *
 * A gig's `scheduled_at` is the wall-clock time at the venue (see
 * lib/dates.ts), so it is written as a *floating* time (no `Z`, no
 * TZID): calendars show 21:00 as 21:00 wherever the phone is, which is
 * exactly what a musician travelling to the venue expects.
 */

export interface IcsGig {
  id: string;
  venue: string;
  location: string | null;
  scheduled_at: string;
  status: "confirmed" | "cancelled" | "completed";
  notes: string | null;
}

export interface IcsOptions {
  /** Event title; defaults to the venue. */
  summary?: string;
  /** Link back to the gig page. */
  url?: string;
  /** Extra lines for the description (e.g. the setlist name). */
  details?: string[];
  /** Length of the event in minutes (the API has no end time). */
  durationMinutes?: number;
  /** For DTSTAMP; injectable for tests. */
  now?: Date;
}

const DEFAULT_DURATION_MINUTES = 120;

/** Escapes a TEXT value (RFC 5545 §3.3.11). */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** Folds a content line at 75 octets (RFC 5545 §3.1), UTF-8 safe. */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    // First line: 75 octets; continuation lines start with a space.
    const limit = parts.length === 0 ? 75 : 74;
    if (size + bytes > limit) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += char;
    size += bytes;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

/** "2026-10-03T21:00:00" → "20261003T210000" (floating local time). */
function floating(wallClock: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(
    wallClock,
  );
  if (!match) return null;
  const [, y, mo, d, h, mi, s = "00"] = match;
  return `${y}${mo}${d}T${h}${mi}${s}`;
}

function addMinutes(wallClock: string, minutes: number): string | null {
  const start = floating(wallClock);
  if (!start) return null;
  const date = new Date(
    Date.UTC(
      Number(start.slice(0, 4)),
      Number(start.slice(4, 6)) - 1,
      Number(start.slice(6, 8)),
      Number(start.slice(9, 11)),
      Number(start.slice(11, 13)) + minutes,
      Number(start.slice(13, 15)),
    ),
  );
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "");
}

function utcStamp(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

/** The .ics file for one gig, or null if its date can't be read. */
export function gigToIcs(gig: IcsGig, options: IcsOptions = {}): string | null {
  const start = floating(gig.scheduled_at);
  const end = addMinutes(
    gig.scheduled_at,
    options.durationMinutes ?? DEFAULT_DURATION_MINUTES,
  );
  if (!start || !end) return null;

  const description = [
    ...(options.details ?? []),
    gig.notes ?? "",
    options.url ?? "",
  ]
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Setlyst//Gigs//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:gig-${gig.id}@setlyst`,
    `DTSTAMP:${utcStamp(options.now ?? new Date())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcsText(options.summary ?? gig.venue)}`,
    gig.location ? `LOCATION:${escapeIcsText(gig.location)}` : null,
    description ? `DESCRIPTION:${escapeIcsText(description)}` : null,
    options.url ? `URL:${options.url}` : null,
    `STATUS:${gig.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((line): line is string => line !== null);

  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}
