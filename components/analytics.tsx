"use client";

import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import { redactAnalyticsUrl } from "@/lib/analytics";

/**
 * Vercel Analytics with share tokens, invite codes and callback URLs taken
 * out of every recorded URL (see lib/analytics.ts).
 */
export function Analytics() {
  return (
    <VercelAnalytics
      beforeSend={(event) => ({ ...event, url: redactAnalyticsUrl(event.url) })}
    />
  );
}
