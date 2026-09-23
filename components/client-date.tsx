"use client";

import { useLocale } from "next-intl";
import { useMounted } from "@/hooks/use-mounted";
import { formatApiDate } from "@/lib/dates";

interface ClientDateProps {
  /** A server timestamp (naive UTC, see lib/dates.ts). */
  value: string | null | undefined;
  options?: Intl.DateTimeFormatOptions;
  className?: string;
}

/**
 * A server timestamp in the viewer's own time zone. Formatted after
 * mount: the server doesn't know the viewer's zone, and formatting there
 * would produce different text than the browser (a hydration mismatch,
 * and a date off by one near midnight).
 */
export function ClientDate({ value, options, className }: ClientDateProps) {
  const locale = useLocale();
  const mounted = useMounted();
  const text = mounted ? formatApiDate(value, locale, options) : "";

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
