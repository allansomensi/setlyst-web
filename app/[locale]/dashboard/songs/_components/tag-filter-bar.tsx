"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { TagChip } from "@/components/tags/tag-chip";
import { Button } from "@/components/ui/button";

/** How many of the most used tags are offered as quick filters. */
const TAG_FILTER_LIMIT = 12;

interface TagFilterBarProps {
  /** The library's tags, most used first. */
  tags: string[];
  /** The tag currently filtering the list, if any. */
  active: string | null;
  onChange: (tag: string | null) => void;
}

/**
 * Quick tag filters above the songs table.
 *
 * The active filter is always visible with a way out, even when it is not
 * among the most used tags (picked from a song row) or no longer exists
 * (renamed or deleted in the tags dialog): a filter the person can't see
 * is a list that looks inexplicably short.
 */
export function TagFilterBar({ tags, active, onChange }: TagFilterBarProps) {
  const t = useTranslations("songs");

  const quick = tags.slice(0, TAG_FILTER_LIMIT);
  const shown = active && !quick.includes(active) ? [active, ...quick] : quick;

  if (shown.length === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      role="group"
      aria-label={t("tagFilterLabel")}
    >
      <span className="text-muted-foreground mr-1 text-xs" aria-hidden>
        {t("tagFilterLabel")}
      </span>
      {shown.map((tag) => {
        const isActive = active === tag;
        return (
          <button
            key={tag}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(isActive ? null : tag)}
            className="focus-visible:ring-ring rounded-full focus-visible:ring-2 focus-visible:outline-none"
          >
            <TagChip
              tag={tag}
              className={
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-secondary/70"
              }
            />
          </button>
        );
      })}
      {active && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => onChange(null)}
        >
          <X className="mr-1 h-3 w-3" aria-hidden />
          {t("clearTagFilter")}
        </Button>
      )}
    </div>
  );
}
