"use client";

import { useSyncExternalStore, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Languages, Loader2, Monitor, Moon, Sun } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { LOCALE_NAMES, isAppLocale, type AppLocale } from "@/i18n/locales";

const THEMES = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
] as const;

const subscribeNoop = () => () => {};

/**
 * Language and theme pickers for the public share pages, where there's no
 * account settings page to set them from.
 *
 * The language is carried in `?lang=` rather than a cookie: it doesn't
 * touch the app-wide `NEXT_LOCALE` of someone who also uses Setlyst, and
 * it survives a reload. It also sets the default language of the PDF
 * export (which can still be changed in the export dialog).
 */
export function PublicPreferences({ className }: { className?: string }) {
  const t = useTranslations("publicPage");
  const tSettings = useTranslations("settings");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const { theme, setTheme } = useTheme();

  // next-themes only knows the stored theme on the client; rendering the
  // pressed state before mount would mismatch the server HTML.
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

  const changeLanguage = (next: AppLocale) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("lang", next);
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  const themeLabels: Record<(typeof THEMES)[number]["value"], string> = {
    light: tSettings("themeLight"),
    dark: tSettings("themeDark"),
    system: tSettings("themeSystem"),
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select
        value={locale}
        onValueChange={(value) => {
          if (isAppLocale(value) && value !== locale) changeLanguage(value);
        }}
      >
        <SelectTrigger
          className="bg-background h-9 gap-2"
          aria-label={t("language")}
        >
          {isPending ? (
            <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
          ) : (
            <Languages className="text-muted-foreground h-4 w-4" />
          )}
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {(Object.keys(LOCALE_NAMES) as AppLocale[]).map((code) => (
            <SelectItem key={code} value={code}>
              {LOCALE_NAMES[code]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div
        role="radiogroup"
        aria-label={t("theme")}
        className="bg-muted flex h-9 items-center rounded-lg p-0.5"
      >
        {THEMES.map(({ value, icon: Icon }) => {
          const active = mounted && theme === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={themeLabels[value]}
              title={themeLabels[value]}
              onClick={() => setTheme(value)}
              className={cn(
                "focus-visible:ring-ring/50 flex h-8 w-8 items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-3",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
