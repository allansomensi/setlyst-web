"use client";

import { useState, useTransition } from "react";
import { Loader2, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/routing";
import { SEARCH_MAX_LENGTH } from "@/lib/console";
import { cn } from "@/lib/utils";

/**
 * The console's global search box (accounts, bands, songs, setlists and
 * support requests at once), on the overview and on the results page.
 * Submitting opens `/dashboard/admin/search?q=`, which runs the search.
 */
export function ConsoleSearchForm({
  defaultValue = "",
  autoFocus = false,
  className,
}: {
  defaultValue?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  const t = useTranslations("console.search");
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const [isPending, startTransition] = useTransition();

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = value.trim();
    startTransition(() => {
      router.push(
        q
          ? `/dashboard/admin/search?${new URLSearchParams({ q })}`
          : "/dashboard/admin/search",
      );
    });
  };

  return (
    <form
      role="search"
      aria-label={t("label")}
      onSubmit={submit}
      className={cn("flex gap-2", className)}
    >
      <div className="relative min-w-0 flex-1">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          type="search"
          name="q"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("placeholder")}
          aria-label={t("label")}
          maxLength={SEARCH_MAX_LENGTH}
          enterKeyHint="search"
          autoComplete="off"
          // Only where searching is the page's whole point.
          autoFocus={autoFocus}
          className="h-10 pl-9"
        />
      </div>
      <Button type="submit" className="h-10" disabled={isPending}>
        {isPending ? (
          <Loader2 className="animate-spin" aria-hidden />
        ) : (
          <Search className="sm:hidden" aria-hidden />
        )}
        <span className="sr-only sm:not-sr-only">{t("submit")}</span>
      </Button>
    </form>
  );
}
