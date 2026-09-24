"use client";

import { useTranslations } from "next-intl";
import { Check, ChevronRight, X } from "lucide-react";
import { Link } from "@/components/nav-link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { useOnboardingFlags } from "@/hooks/use-onboarding";
import { cn } from "@/lib/utils";
import { InstallApp } from "./install-app";

/** Accounts up to this many songs still count as "getting started". */
const NEW_ACCOUNT_SONGS = 5;

interface Counts {
  songs: number;
  songsWithLyrics: number;
  setlists: number;
}

type StepKey = "song" | "lyrics" | "setlist" | "live" | "install";

/**
 * First steps on the dashboard home for a new account: a song, its lyrics
 * with chords, a setlist, a first look at Live Mode, and installing the
 * app. Each step links to where it is done and ticks itself off; the list
 * goes away once everything is done or when dismissed.
 */
export function OnboardingChecklist({ counts }: { counts: Counts }) {
  const t = useTranslations("dashboard.onboarding");
  const flags = useOnboardingFlags();
  const { state: installState } = useInstallPrompt();

  // Unknown until mounted: render nothing rather than flash.
  if (!flags || flags.dismissed) return null;

  const done: Record<StepKey, boolean> = {
    song: counts.songs > 0,
    lyrics: counts.songsWithLyrics > 0,
    setlist: counts.setlists > 0,
    live: flags.liveOpened,
    install: installState === "installed",
  };
  const steps: { key: StepKey; href?: string }[] = [
    { key: "song", href: "/dashboard/songs" },
    { key: "lyrics", href: "/dashboard/songs" },
    { key: "setlist", href: "/dashboard/setlists" },
    { key: "live", href: "/dashboard/setlists" },
    { key: "install" },
  ];
  const completed = steps.filter(({ key }) => done[key]).length;
  const contentMissing = !done.song || !done.lyrics || !done.setlist;
  const isNew = counts.songs <= NEW_ACCOUNT_SONGS;
  if (completed === steps.length || (!contentMissing && !isNew)) return null;

  const nextKey = steps.find(({ key }) => !done[key])?.key;

  return (
    <section
      aria-labelledby="onboarding-title"
      className="bg-card rounded-xl border p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 id="onboarding-title" className="text-lg font-semibold">
            {t("title")}
          </h2>
          <p className="text-muted-foreground text-sm">{t("description")}</p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={flags.dismiss}
          aria-label={t("dismiss")}
          title={t("dismiss")}
        >
          <X aria-hidden />
        </Button>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Progress
          value={(completed / steps.length) * 100}
          className="h-1.5 flex-1"
          aria-label={t("progress", { done: completed, total: steps.length })}
        />
        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
          {t("progress", { done: completed, total: steps.length })}
        </span>
      </div>

      <ol className="mt-4 divide-y">
        {steps.map(({ key, href }) => {
          const isDone = done[key];
          const isNext = key === nextKey;
          const body = (
            <>
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  isDone
                    ? "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500"
                    : isNext
                      ? "border-primary text-primary"
                      : "text-muted-foreground",
                )}
                aria-hidden
              >
                {isDone ? <Check className="size-3.5" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block text-sm font-medium",
                    isDone && "text-muted-foreground line-through",
                  )}
                >
                  {t(`steps.${key}.title`)}
                  <span className="sr-only">
                    {" · "}
                    {isDone ? t("stepDone") : t("stepTodo")}
                  </span>
                </span>
                {!isDone && (
                  <span className="text-muted-foreground block text-xs">
                    {t(`steps.${key}.hint`)}
                  </span>
                )}
              </span>
            </>
          );
          return (
            <li key={key} className="py-1">
              {href && !isDone ? (
                <Link
                  href={href}
                  className="hover:bg-muted/50 focus-visible:ring-ring/50 -mx-2 flex items-center gap-3 rounded-lg px-2 py-2 outline-none focus-visible:ring-3"
                >
                  {body}
                  <ChevronRight
                    className="text-muted-foreground size-4 shrink-0"
                    aria-hidden
                  />
                </Link>
              ) : (
                <div className="flex items-start gap-3 py-2">{body}</div>
              )}
              {key === "install" && !isDone && (
                <InstallApp className="mt-1 mb-2 ml-9" />
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
