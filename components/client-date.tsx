"use client";

import { useLocale, useTimeZone } from "next-intl";
import { useMounted } from "@/hooks/use-mounted";
import { formatApiDate } from "@/lib/dates";

interface ClientDateProps {
  /** A server timestamp (naive UTC, see lib/dates.ts). */
  value: string | null | undefined;
  options?: Intl.DateTimeFormatOptions;
  className?: string;
}

/** The browser's own zone, or null when it can't say. */
function browserTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/**
 * A server timestamp in the viewer's own time zone.
 *
 * The server renders it in the zone the browser reported earlier (the
 * `tz` cookie, handed to next-intl in i18n/request.ts), so the text is
 * there from the first paint and matches on hydration. After mount the
 * browser's live zone wins, which only differs on a first visit or after
 * travelling (the cookie then catches up).
 */
export function ClientDate({ value, options, className }: ClientDateProps) {
  const locale = useLocale();
  const requestZone = useTimeZone();
  const mounted = useMounted();
  const timeZone =
    (mounted ? browserTimeZone() : null) ?? requestZone ?? undefined;
  const text = formatApiDate(value, locale, {
    ...options,
    ...(timeZone && !options?.timeZone ? { timeZone } : {}),
  });

  return (
    <time
      dateTime={value ?? undefined}
      className={className}
      suppressHydrationWarning
    >
      {text}
    </time>
  );
}
