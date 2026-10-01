"use client";

import { useTranslations } from "next-intl";
import { History, ShieldQuestion, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SignInActivityList } from "@/components/account/sign-in-activity-list";
import { countFailedSignIns } from "@/lib/sign-in-activity";
import type { SignInEvent } from "@/types/operations";

const anchorClass =
  "focus-visible:ring-ring/50 rounded-sm font-medium underline underline-offset-4 outline-none focus-visible:ring-3";

/**
 * "Recent sign-in activity": the account's sign-ins, failed attempts and
 * lockouts of the last 90 days, so its owner can spot access they don't
 * recognize, and what to do then (the password and "sign out of all
 * devices" cards on this same page). `events` is `null` when it couldn't
 * be loaded.
 */
export function SignInActivityCard({
  events,
}: {
  events: SignInEvent[] | null;
}) {
  const t = useTranslations("security.signIns");
  const failed = events ? countFailedSignIns(events) : 0;

  return (
    <Card id="sign-ins" className="scroll-mt-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="text-primary size-4" aria-hidden />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {events === null ? (
          <Alert variant="warning">
            <TriangleAlert />
            <AlertDescription>{t("unavailable")}</AlertDescription>
          </Alert>
        ) : events.length === 0 ? (
          <EmptyState
            compact
            icon={History}
            title={t("empty.title")}
            description={t("empty.description")}
          />
        ) : (
          <>
            {failed > 0 && (
              <p className="text-muted-foreground text-sm">
                {t("failedSummary", { count: failed })}
              </p>
            )}
            <SignInActivityList events={events} />
          </>
        )}
        <div className="bg-muted/40 flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm">
          <ShieldQuestion
            className="text-muted-foreground mt-0.5 size-4 shrink-0"
            aria-hidden
          />
          <p className="text-muted-foreground">
            {t.rich("hint", {
              password: (chunks) => (
                <a href="#password" className={anchorClass}>
                  {chunks}
                </a>
              ),
              sessions: (chunks) => (
                <a href="#sessions" className={anchorClass}>
                  {chunks}
                </a>
              ),
            })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
