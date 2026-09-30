"use client";

import { useState, useSyncExternalStore } from "react";
import { CalendarRange, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar, calendarLocale } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { fromDay, parseDay, toDay } from "@/lib/date-range";
import { cn } from "@/lib/utils";
import { useQueryParams } from "./list-controls";

const WIDE = "(min-width: 768px)";

/** Two months side by side from tablets up, one on a phone. */
function useWide(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(WIDE);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(WIDE).matches,
    () => true,
  );
}

type Preset = "today" | "last7" | "last30" | "thisMonth" | "lastMonth";
const PRESETS: Preset[] = [
  "today",
  "last7",
  "last30",
  "thisMonth",
  "lastMonth",
];

function presetRange(preset: Preset, now = new Date()): DateRange {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  switch (preset) {
    case "today":
      return { from: new Date(y, m, d), to: new Date(y, m, d) };
    case "last7":
      return { from: new Date(y, m, d - 6), to: new Date(y, m, d) };
    case "last30":
      return { from: new Date(y, m, d - 29), to: new Date(y, m, d) };
    case "thisMonth":
      return { from: new Date(y, m, 1), to: new Date(y, m, d) };
    case "lastMonth":
      return { from: new Date(y, m - 1, 1), to: new Date(y, m, 0) };
  }
}

function sameDay(a: Date | undefined, b: Date | undefined) {
  return !!a && !!b && toDay(a) === toDay(b);
}

/**
 * A day range filter kept in the URL (`?from=YYYY-MM-DD&to=YYYY-MM-DD`,
 * whole days in the viewer's calendar, both included), for the staff
 * listings paged server-side. Picked in a calendar or from a shortcut
 * ("last 7 days"); the calendar only applies once both ends are chosen,
 * so the list isn't reloaded halfway through a pick.
 */
export function DateRangeFilter({
  fromParam = "from",
  toParam = "to",
  className,
}: {
  fromParam?: string;
  toParam?: string;
  className?: string;
}) {
  const t = useTranslations("staff.dateRange");
  const locale = useLocale();
  const wide = useWide();
  const { searchParams, set } = useQueryParams();
  const from = parseDay(searchParams.get(fromParam));
  const to = parseDay(searchParams.get(toParam));
  const applied: DateRange | undefined =
    from || to
      ? {
          from: fromDay((from ?? to)!),
          to: fromDay((to ?? from)!),
        }
      : undefined;

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>(applied);
  const [month, setMonth] = useState<Date | undefined>(undefined);

  const apply = (range: DateRange | undefined) => {
    set({
      [fromParam]: range?.from ? toDay(range.from) : null,
      [toParam]: range?.from ? toDay(range.to ?? range.from) : null,
    });
    setOpen(false);
  };

  const dayFormat = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  });
  const fullFormat = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const describe = (range: DateRange | undefined): string | null => {
    if (!range?.from) return null;
    const end = range.to ?? range.from;
    if (sameDay(range.from, end)) return fullFormat.format(range.from);
    const sameYear = range.from.getFullYear() === end.getFullYear();
    return t("range", {
      from: (sameYear ? dayFormat : fullFormat).format(range.from),
      to: fullFormat.format(end),
    });
  };

  const activePreset = PRESETS.find((preset) => {
    const range = presetRange(preset);
    return sameDay(range.from, draft?.from) && sameDay(range.to, draft?.to);
  });
  const label = describe(applied);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Popover
        open={open}
        onOpenChange={(next) => {
          if (next) {
            // Every open starts from what's applied, on its first month.
            setDraft(applied);
            setMonth(
              applied?.to
                ? new Date(
                    applied.to.getFullYear(),
                    applied.to.getMonth() - (wide ? 1 : 0),
                  )
                : undefined,
            );
          }
          setOpen(next);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "h-9 w-full justify-start gap-2 font-normal sm:w-auto",
              !label && "text-muted-foreground",
            )}
            aria-label={label ? t("labelWith", { range: label }) : t("label")}
          >
            <CalendarRange className="h-4 w-4" aria-hidden />
            <span className="truncate">{label ?? t("any")}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-auto max-w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0"
        >
          <div className="flex flex-col md:flex-row">
            <div className="flex gap-1 overflow-x-auto border-b p-2 md:w-40 md:flex-col md:overflow-visible md:border-r md:border-b-0">
              {PRESETS.map((preset) => (
                <Button
                  key={preset}
                  variant={activePreset === preset ? "secondary" : "ghost"}
                  size="sm"
                  className="shrink-0 justify-start font-normal"
                  onClick={() => apply(presetRange(preset))}
                >
                  {t(`presets.${preset}`)}
                </Button>
              ))}
            </div>
            <div>
              <Calendar
                mode="range"
                locale={calendarLocale(locale)}
                numberOfMonths={wide ? 2 : 1}
                month={month}
                onMonthChange={setMonth}
                selected={draft}
                onSelect={setDraft}
                disabled={{ after: new Date() }}
                className="mx-auto"
              />
              <div className="flex flex-wrap items-center gap-2 border-t p-3">
                <p className="text-muted-foreground min-w-0 flex-1 text-xs">
                  {describe(draft) ?? t("hint")}
                </p>
                <div className="ml-auto flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => apply(undefined)}
                    disabled={!applied && !draft?.from}
                  >
                    {t("clear")}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => apply(draft)}
                    disabled={!draft?.from}
                  >
                    {t("apply")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {label && (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => apply(undefined)}
          aria-label={t("clear")}
          title={t("clear")}
        >
          <X className="h-4 w-4" aria-hidden />
        </Button>
      )}
    </div>
  );
}
