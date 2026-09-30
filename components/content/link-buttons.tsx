"use client";

import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { PROVIDER_NAMES } from "@/lib/content-links";
import { cn } from "@/lib/utils";
import type { Link } from "@/types/content";
import { ProviderIcon } from "./provider-icon";

/**
 * Stored links as provider buttons. They always open in a new tab without
 * an opener or referrer (the destination is a third-party site).
 */
export function LinkButtons({
  links,
  className,
}: {
  links: Link[] | undefined;
  className?: string;
}) {
  const t = useTranslations("links");
  if (!links?.length) return null;

  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {links.map((link) => {
        const provider = PROVIDER_NAMES[link.provider] ?? link.provider;
        const label = link.label?.trim() || provider;
        // The provider under the label, unless the label already is it
        // ("Spotify" over "Spotify").
        const showProvider =
          label.localeCompare(provider, undefined, { sensitivity: "base" }) !==
          0;
        return (
          <li key={link.url}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-card hover:bg-accent/50 focus-visible:ring-ring/50 inline-flex max-w-full items-center gap-2 rounded-lg border py-1.5 pr-3 pl-1.5 text-sm transition-colors focus-visible:ring-3 focus-visible:outline-none"
              aria-label={t("openIn", { label, provider })}
            >
              <ProviderIcon provider={link.provider} />
              {/* flex-1: on a full-width button (a side card) the
                  external-link mark sits at the right edge. */}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{label}</span>
                {showProvider && (
                  <span className="text-muted-foreground block text-xs">
                    {provider}
                  </span>
                )}
              </span>
              <ExternalLink
                className="text-muted-foreground h-3.5 w-3.5 shrink-0"
                aria-hidden
              />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
