"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * The author's photo on the About page: their current GitHub avatar
 * (`/api/images/author-avatar`), or their initials while GitHub can't be
 * reached.
 */
export function AuthorAvatar({
  initials,
  className,
}: {
  initials: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const base = cn(
    "flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full",
    className,
  );

  if (failed) {
    return (
      <span
        className={cn(base, "bg-primary/10 text-primary text-xl font-bold")}
        aria-hidden
      >
        {initials}
      </span>
    );
  }

  return (
    // A same-origin proxy route, not a static asset: next/image adds
    // nothing here.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/api/images/author-avatar"
      // Decorative: the author's name is right beside it.
      alt=""
      width={64}
      height={64}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={cn(base, "bg-muted object-cover")}
    />
  );
}
