"use client";

import { PublicLinkStatus } from "@/components/share/public-link-status";

/** A share link that was turned off, replaced or never existed. */
export default function PublicLinkNotFound() {
  return <PublicLinkStatus kind="gone" resource="setlist" />;
}
