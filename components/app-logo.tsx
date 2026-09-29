import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The Setlyst app icon — the same artwork as the installed PWA and the
 * favicon, so the brand reads the same on the home screen and inside the
 * app. Served from /public (already precached for offline use) through
 * next/image, which picks a right-sized rendition for each place it's
 * shown instead of shipping the 512px original.
 */
export function AppLogo({
  size = 32,
  className,
  priority = false,
  decorative = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
  /**
   * When the wordmark "Setlyst" is written right next to the icon, the
   * icon adds nothing for a screen reader (it would announce "Setlyst
   * Setlyst"), so it is left out of the accessibility tree.
   */
  decorative?: boolean;
}) {
  return (
    <Image
      src="/web-app-manifest-512x512.png"
      alt={decorative ? "" : "Setlyst"}
      width={size}
      height={size}
      priority={priority}
      className={cn("shrink-0 select-none", className)}
      draggable={false}
    />
  );
}
