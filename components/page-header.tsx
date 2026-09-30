import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The title block every top-level dashboard page opens with: the page's
 * `<h1>`, one line saying what the page is for, and its actions on the
 * right (stacked under the title on a phone).
 *
 * One component so every page reads the same: the title used to be
 * `text-3xl` on some pages and `text-2xl sm:text-3xl` on others, with the
 * subtitle's spacing and the actions' alignment varying from page to
 * page.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
  titleId,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** Buttons, primary last (the right edge, where the eye ends). */
  actions?: ReactNode;
  className?: string;
  titleId?: string;
  /** Extra content under the description (a notice, a meta line). */
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <h1
          id={titleId}
          className="text-2xl font-bold tracking-tight text-balance sm:text-3xl"
        >
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground max-w-2xl text-pretty">
            {description}
          </p>
        )}
        {children}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end sm:pt-1">
          {actions}
        </div>
      )}
    </div>
  );
}
