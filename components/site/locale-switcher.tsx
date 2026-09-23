"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Languages, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePathname, useRouter } from "@/i18n/routing";
import { LOCALE_NAMES, isAppLocale, type AppLocale } from "@/i18n/locales";
import { cn } from "@/lib/utils";

/**
 * Language picker for the public site. Switches the locale segment of the
 * current URL (keeping the query and the hash), which next-intl's
 * middleware then remembers in the `NEXT_LOCALE` cookie.
 */
export function LocaleSwitcher({
  className,
  fullWidth = false,
}: {
  className?: string;
  fullWidth?: boolean;
}) {
  const t = useTranslations("site");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const change = (next: AppLocale) => {
    // Read at click time (not with useSearchParams) so the header never
    // forces a Suspense boundary on statically rendered pages.
    const query = Object.fromEntries(
      new URLSearchParams(window.location.search).entries(),
    );
    const hash = window.location.hash.slice(1);
    startTransition(() => {
      router.replace(
        { pathname, query, ...(hash ? { hash } : {}) },
        { locale: next, scroll: false },
      );
    });
  };

  return (
    <Select
      value={locale}
      onValueChange={(value) => {
        if (isAppLocale(value) && value !== locale) change(value);
      }}
    >
      <SelectTrigger
        className={cn(
          "gap-2 data-[size=default]:h-9",
          fullWidth ? "w-full" : "w-auto",
          className,
        )}
        aria-label={t("language")}
      >
        {isPending ? (
          <Loader2 className="text-muted-foreground size-4 animate-spin" />
        ) : (
          <Languages className="text-muted-foreground size-4" />
        )}
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {(Object.keys(LOCALE_NAMES) as AppLocale[]).map((code) => (
          <SelectItem key={code} value={code} lang={code}>
            {LOCALE_NAMES[code]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
