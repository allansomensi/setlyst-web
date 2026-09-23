"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const THEMES = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
] as const;

const subscribeNoop = () => () => {};

/**
 * Light / dark / system picker for the public site. Hidden when the
 * signed-in visitor's account forces a theme (the `[locale]` layout
 * passes it to next-themes as `forcedTheme`), since picking would have no
 * effect there; the account setting is changed in Settings.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations("site");
  const { theme, setTheme, forcedTheme } = useTheme();
  // next-themes only knows the stored theme on the client.
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

  if (forcedTheme) return null;

  const labels = {
    light: t("themeLight"),
    dark: t("themeDark"),
    system: t("themeSystem"),
  } as const;

  return (
    <div
      role="group"
      aria-label={t("theme")}
      className={cn(
        "bg-muted flex h-9 w-fit items-center rounded-lg p-0.5",
        className,
      )}
    >
      {THEMES.map(({ value, icon: Icon }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            aria-label={labels[value]}
            title={labels[value]}
            onClick={() => setTheme(value)}
            className={cn(
              "focus-visible:ring-ring/50 flex size-8 items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-3",
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
}
