"use client";

import { PublicLinkError } from "@/components/share/public-link-status";

/**
 * The API couldn't be reached or failed: the link itself may be fine, so
 * this says "temporarily unavailable" and offers a retry — never "not
 * found", which made recipients think the link had been revoked.
 */
export default function PublicLinkRouteError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <PublicLinkError {...props} resource="setlist" />;
}
