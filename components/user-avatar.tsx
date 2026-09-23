"use client";

import { useState, type CSSProperties } from "react";
import { avatarHue, getInitials, proxiedImageSrc } from "@/lib/avatar";
import { cn } from "@/lib/utils";

const SIZES = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
  xl: "size-20 text-2xl",
} as const;

export type AvatarSize = keyof typeof SIZES;

export interface UserAvatarProps {
  userId: string;
  /** Username or display name: alt text and initials. */
  name: string;
  /**
   * The avatar URL from the API, if the user has one. Only its presence
   * (and a hash, for cache busting) is used: the image itself always
   * comes through `/api/images/avatar/{userId}`.
   */
  avatarUrl?: string | null;
  size?: AvatarSize;
  className?: string;
}

/**
 * A user's avatar, or their initials on a color derived from their id
 * when there is no image or it can't be loaded (removed, blocked,
 * unreachable).
 */
export function UserAvatar({
  userId,
  name,
  avatarUrl,
  size = "md",
  className,
}: UserAvatarProps) {
  const src = avatarUrl
    ? proxiedImageSrc(
        `/api/images/avatar/${encodeURIComponent(userId)}`,
        avatarUrl,
      )
    : null;
  // Keyed by src: a new avatar gets a fresh attempt after a failed one.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = src !== null && failedSrc !== src;

  const base = cn(
    "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full select-none",
    SIZES[size],
    className,
  );

  if (showImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailedSrc(src)}
        className={cn(base, "bg-muted object-cover")}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={name}
      style={{ "--avatar-hue": avatarHue(userId) } as CSSProperties}
      className={cn(
        base,
        "bg-[oklch(0.9_0.06_var(--avatar-hue))] font-semibold text-[oklch(0.35_0.09_var(--avatar-hue))] dark:bg-[oklch(0.36_0.07_var(--avatar-hue))] dark:text-[oklch(0.93_0.04_var(--avatar-hue))]",
      )}
    >
      {getInitials(name)}
    </span>
  );
}
