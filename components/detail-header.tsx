import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { Link } from "@/components/nav-link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The header of a detail page (a setlist, a song, a show, a band, a
 * tour): back button, title block, and the page's actions.
 *
 * The title block claims a comfortable width first (30rem) and the
 * actions wrap onto their own row below it when both don't fit side by
 * side. Before, the two shared one row from the first breakpoint on, and
 * a setlist or a song with six or seven actions squeezed its title into a
 * narrow column: the name broke over two lines, the tags stacked one per
 * line and the back button floated halfway down the block.
 */
export function DetailHeader({
  children,
  actions,
  className,
}: {
  /** The title block, usually a `DetailBackButton` and the heading. */
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-start justify-between gap-x-6 gap-y-4",
        className,
      )}
    >
      <div className="flex min-w-0 flex-[1_1_30rem] items-start gap-3 sm:gap-4">
        {children}
      </div>
      {actions && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:max-w-full">
          {actions}
        </div>
      )}
    </header>
  );
}

/**
 * Back to the parent page. Desktop only: on a phone the breadcrumbs above
 * and the tab bar below already lead back, and the width goes to the
 * title. Nudged down to sit on the title's first line.
 */
export function DetailBackButton({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Button
      variant="outline"
      size="icon"
      asChild
      className="mt-0.5 hidden shrink-0 sm:mt-1 sm:inline-flex"
    >
      <Link href={href} aria-label={label} title={label}>
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </Link>
    </Button>
  );
}
