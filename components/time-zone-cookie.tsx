"use client";

import { useEffect } from "react";
import { TIME_ZONE_COOKIE, validTimeZone } from "@/lib/dates";

const MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * Tells the server which time zone this browser is in (the `tz` cookie,
 * read by i18n/request.ts), so dates rendered on the server show the
 * viewer's local time instead of the server's UTC. Written only when it
 * changed (first visit, travel, a device clock change).
 */
export function TimeZoneCookie() {
  useEffect(() => {
    try {
      const zone = validTimeZone(
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      );
      if (!zone) return;
      const current = document.cookie
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${TIME_ZONE_COOKIE}=`))
        ?.slice(TIME_ZONE_COOKIE.length + 1);
      if (current && decodeURIComponent(current) === zone) return;
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${TIME_ZONE_COOKIE}=${encodeURIComponent(zone)}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax${secure}`;
    } catch {
      // Cookies disabled: dates fall back to the default zone.
    }
  }, []);

  return null;
}
