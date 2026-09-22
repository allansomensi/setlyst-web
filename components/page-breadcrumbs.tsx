import { Fragment } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, Home } from "lucide-react";
import { Link } from "@/components/nav-link";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  /** Omitted for the current page, which is the last item. */
  href?: string;
}

interface PageBreadcrumbsProps {
  items: BreadcrumbItem[];
  /** Smaller text/icons, for tight headers like the lyrics editor's. */
  compact?: boolean;
  className?: string;
}

/**
 * Trail shown above the header of nested dashboard pages
 * (`bands/[id]/gigs`, `setlists/[id]/analytics`, …).
 *
 * The back chevron those pages already have only goes one level up and
 * says nothing about *where* you are — which band a gig list belongs to,
 * which setlist an analytics chart is for. This names every level and
 * lets any of them be jumped to directly.
 *
 * Long names (setlist and band titles are user-written) are truncated per
 * crumb rather than wrapping, so the trail stays one line on a phone; the
 * full name is still in the `title` tooltip and in the page's own `<h1>`.
 *
 * Deliberately hook-free apart from `useTranslations`, which next-intl
 * supports in both Server and Client Components — so this can be rendered
 * from either kind of page.
 */
export function PageBreadcrumbs({
  items,
  compact = false,
  className,
}: PageBreadcrumbsProps) {
  const t = useTranslations("nav");

  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      <ol
        className={cn(
          "text-muted-foreground flex min-w-0 items-center",
          compact ? "gap-1 text-xs" : "gap-1.5 text-sm",
        )}
      >
        <li className="flex shrink-0 items-center">
          <Link
            href="/dashboard"
            className="hover:text-foreground focus-visible:ring-ring rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <Home
              className={compact ? "h-3.5 w-3.5" : "h-4 w-4"}
              aria-hidden="true"
            />
            <span className="sr-only">{t("home")}</span>
          </Link>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <Fragment key={`${index}-${item.label}`}>
              <li aria-hidden="true" className="flex shrink-0 items-center">
                <ChevronRight
                  className={cn(
                    "opacity-60",
                    compact ? "h-3 w-3" : "h-3.5 w-3.5",
                  )}
                />
              </li>
              <li
                className={cn(
                  "min-w-0",
                  // On a narrow screen, the section name ("Setlists",
                  // "Bands") is short and is what orients you, so it never
                  // truncates. Intermediate names (a band, a setlist) are
                  // the long, user-written ones, so they give way. The
                  // current page only truncates when it's the only name
                  // there is to give (`Setlists › <long setlist title>`);
                  // below that it's a short page title like "Analytics".
                  index === 0 && !isLast
                    ? "shrink-0"
                    : isLast
                      ? items.length > 2
                        ? "shrink-0"
                        : "shrink"
                      : "max-w-[16rem] shrink-[4]",
                )}
              >
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    title={item.label}
                    className="hover:text-foreground focus-visible:ring-ring block truncate rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    aria-current="page"
                    title={item.label}
                    className="text-foreground block truncate font-medium"
                  >
                    {item.label}
                  </span>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
