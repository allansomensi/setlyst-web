"use client";

import { useState } from "react";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { ChevronDown, CircleCheck, CircleX, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatApiDateTime } from "@/lib/dates";
import { isWrongSecondFactor, signInMethodParts } from "@/lib/sign-in-activity";
import { cn } from "@/lib/utils";
import type { SignInEvent } from "@/types/operations";

const OUTCOME_STYLE: Record<
  SignInEvent["outcome"],
  { icon: typeof CircleCheck; className: string }
> = {
  succeeded: {
    icon: CircleCheck,
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  failed: {
    icon: CircleX,
    className: "bg-destructive/10 text-destructive dark:bg-destructive/20",
  },
  locked: {
    icon: Lock,
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
};

/**
 * Sign-in attempts, newest first (`GET /users/me/sign-ins`): whether
 * each one worked, how (password, Google, a second factor), whether it
 * failed at the second factor, where from and when, in the viewer's time
 * zone. The first `initialCount` show; the rest behind "Show all".
 */
export function SignInActivityList({
  events,
  initialCount = 10,
}: {
  events: SignInEvent[];
  initialCount?: number;
}) {
  const t = useTranslations("security.signIns");
  const locale = useLocale();
  const timeZone = useTimeZone();
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? events : events.slice(0, initialCount);
  const hidden = events.length - visible.length;

  return (
    <div className="space-y-2">
      <ul id="sign-in-activity-list" className="divide-y">
        {visible.map((event, index) => {
          const style = OUTCOME_STYLE[event.outcome] ?? OUTCOME_STYLE.failed;
          const Icon = style.icon;
          const methods = signInMethodParts(event.method);
          return (
            <li
              key={`${event.created_at}-${index}`}
              className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
            >
              <span
                className={cn(
                  "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                  style.className,
                )}
                aria-hidden
              >
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge className={style.className}>
                    {t(`outcome.${event.outcome}`)}
                  </Badge>
                  {methods.length > 0 && (
                    <span className="text-sm font-medium">
                      {methods.map((part) => t(`method.${part}`)).join(" + ")}
                    </span>
                  )}
                  {isWrongSecondFactor(event) && (
                    <Badge variant="outline">{t("wrongSecondFactor")}</Badge>
                  )}
                </div>
                <p className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                  <time dateTime={event.created_at}>
                    {formatApiDateTime(event.created_at, locale, timeZone)}
                  </time>
                  <span>
                    <span className="sr-only">{t("ipAddress")}: </span>
                    {event.ip_address ? (
                      <span className="font-mono break-all">
                        {event.ip_address}
                      </span>
                    ) : (
                      t("unknownAddress")
                    )}
                  </span>
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      {(hidden > 0 || expanded) && events.length > initialCount && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full"
          aria-expanded={expanded}
          aria-controls="sign-in-activity-list"
          onClick={() => setExpanded((value) => !value)}
        >
          <ChevronDown
            className={cn("mr-1 size-4 transition-transform", {
              "rotate-180": expanded,
            })}
            aria-hidden
          />
          {expanded ? t("showLess") : t("showAll", { count: events.length })}
        </Button>
      )}
    </div>
  );
}
