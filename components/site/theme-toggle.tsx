"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun, SunMoon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const THEMES = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
] as const;

type ThemeValue = (typeof THEMES)[number]["value"];

const subscribeNoop = () => () => {};

/**
 * Light / dark / system picker for the public site. Hidden when the
 * signed-in visitor's account forces a theme (the `[locale]` layout
 * passes it to next-themes as `forcedTheme`), since picking would have no
 * effect there; the account setting is changed in Settings.
 *
 * `layout`:
 * - `auto` (default): a single icon button with a menu below `sm`, the
 *   three-way segmented control from `sm` up. On a phone the segmented
 *   control next to the language picker took a third of a slim header
 *   for a setting people change once.
 * - `segmented`: always the segmented control (the mobile menu panel,
 *   which has the room and where seeing all three options helps).
 *
 * `labelled` puts the visible "Theme" label in front of the control, in
 * a row; it lives here so the label disappears along with the control
 * when the theme is forced.
 */
export function ThemeToggle({
  className,
  layout = "auto",
  labelled = false,
}: {
  className?: string;
  layout?: "auto" | "segmented";
  labelled?: boolean;
}) {
  const t = useTranslations("site");
  const { theme, setTheme, forcedTheme } = useTheme();
  // next-themes only knows the stored theme on the client.
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

  if (forcedTheme) return null;

  const labels: Record<ThemeValue, string> = {
    light: t("themeLight"),
    dark: t("themeDark"),
    system: t("themeSystem"),
  };
  const current = mounted
    ? THEMES.find((item) => item.value === theme)
    : undefined;

  const segmented = (
    <div
      role="group"
      aria-label={t("theme")}
      className={cn(
        "bg-muted flex h-9 w-fit items-center rounded-lg p-0.5 pointer-coarse:h-11",
        layout === "auto" && "hidden sm:flex",
        !labelled && className,
      )}
    >
      {THEMES.map(({ value, icon: Icon }) => {
        const active = current?.value === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            aria-label={labels[value]}
            title={labels[value]}
            onClick={() => setTheme(value)}
            className={cn(
              "focus-visible:ring-ring/50 flex size-8 items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-3 pointer-coarse:size-10",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );

  // Before mounting the stored choice is unknown: a neutral icon rather
  // than one that may be wrong for a moment.
  const CurrentIcon = current?.icon ?? SunMoon;
  const menu = layout === "auto" && (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon-lg"
          className={cn("sm:hidden", !labelled && className)}
          aria-label={
            current ? `${t("theme")}: ${labels[current.value]}` : t("theme")
          }
        >
          <CurrentIcon className="text-muted-foreground size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        <DropdownMenuRadioGroup
          value={current?.value ?? ""}
          onValueChange={(value) => setTheme(value)}
        >
          {THEMES.map(({ value, icon: Icon }) => (
            <DropdownMenuRadioItem
              key={value}
              value={value}
              className="py-1.5 pointer-coarse:py-2.5"
            >
              <Icon className="text-muted-foreground" />
              {labels[value]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (!labelled) {
    return (
      <>
        {menu}
        {segmented}
      </>
    );
  }

  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      {/* Visual only: the control carries the same name for assistive
          technology. */}
      <span aria-hidden className="text-muted-foreground text-sm font-medium">
        {t("theme")}
      </span>
      {menu}
      {segmented}
    </div>
  );
}
