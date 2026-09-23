"use client";

import { useState } from "react";
import { getInitials, proxiedImageSrc } from "@/lib/avatar";
import { cn } from "@/lib/utils";

interface BandAvatarProps {
  /** Needed to load the logo through `/api/images/band-logo/{bandId}`. */
  bandId: string;
  name: string;
  /** The logo URL from the API; only its presence (and hash) is used. */
  logoUrl?: string | null;
  className?: string;
}

/**
 * A band's logo, served by the app's image proxy (external images are
 * blocked by the CSP), with the band's initials as fallback when there is
 * no logo or it can't be loaded.
 */
export function BandAvatar({
  bandId,
  name,
  logoUrl,
  className,
}: BandAvatarProps) {
  const src = logoUrl
    ? proxiedImageSrc(
        `/api/images/band-logo/${encodeURIComponent(bandId)}`,
        logoUrl,
      )
    : null;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (src && failedSrc !== src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailedSrc(src)}
        className={cn(
          "bg-muted h-10 w-10 shrink-0 rounded-lg border object-cover",
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-sm font-semibold",
        className,
      )}
      aria-hidden
    >
      {getInitials(name)}
    </div>
  );
}
