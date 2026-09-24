import "server-only";

import { cookies } from "next/headers";
import {
  DEFAULT_TIME_ZONE,
  TIME_ZONE_COOKIE,
  validTimeZone,
} from "@/lib/dates";

/**
 * The viewer's time zone for server-side formatting: what their browser
 * reported in the `tz` cookie (components/time-zone-cookie.tsx), or the
 * primary market's zone before it has. Outside a request (build time) the
 * default.
 */
export async function getRequestTimeZone(): Promise<string> {
  try {
    const store = await cookies();
    return (
      validTimeZone(store.get(TIME_ZONE_COOKIE)?.value) ?? DEFAULT_TIME_ZONE
    );
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}
