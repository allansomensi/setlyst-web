"use client";

import { useEffect, useState } from "react";
import { CalendarClock, CreditCard, Gift, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { ClientDate } from "@/components/client-date";
import { Link } from "@/components/nav-link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUiSettings } from "@/components/providers/ui-settings-provider";
import type { TrialInfo } from "@/lib/trial";

/**
 * Shown once per account while a trial runs (normally right after sign-up):
 * says plainly that everything is unlocked because a free trial of a paid
 * plan started, when it ends, and that nothing is charged. Dismissal is
 * saved on the account (ui_settings.onboarding), so it doesn't come back
 * on another device.
 */
export function TrialWelcomeDialog({
  trial,
  name,
}: {
  trial: TrialInfo | null;
  name?: string | null;
}) {
  const t = useTranslations("trial.welcome");
  const { settings, update } = useUiSettings();
  const [dismissed, setDismissed] = useState(false);
  const [ready, setReady] = useState(false);
  const pendingWelcome =
    Boolean(trial) && !settings.onboarding.trialWelcomeSeen;

  // Waits its turn: other modals (announcements load a moment after the
  // page) go first, so two dialogs never stack.
  useEffect(() => {
    if (!pendingWelcome || ready) return;
    let timer: ReturnType<typeof setTimeout>;
    const check = () => {
      const other = document.querySelector(
        '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]',
      );
      if (other) timer = setTimeout(check, 500);
      else setReady(true);
    };
    timer = setTimeout(check, 1500);
    return () => clearTimeout(timer);
  }, [pendingWelcome, ready]);

  if (!trial || !pendingWelcome || !ready) return null;

  const dismiss = () => {
    setDismissed(true);
    void update({ onboarding: { trialWelcomeSeen: true } });
  };

  return (
    <Dialog
      open={!dismissed}
      onOpenChange={(open) => {
        if (!open) dismiss();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <span className="bg-primary/10 text-primary mb-1 flex size-11 items-center justify-center rounded-full">
            <Gift className="size-5" aria-hidden />
          </span>
          <DialogTitle className="text-lg">
            {t("title", { plan: trial.planName })}
          </DialogTitle>
          <DialogDescription className="text-foreground/90 text-sm leading-relaxed">
            {t.rich("lead", {
              name: name ?? "",
              hasName: name ? "yes" : "no",
              days: trial.totalDays,
              plan: trial.planName,
              strong: (chunks) => (
                <strong className="text-foreground">{chunks}</strong>
              ),
            })}
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-3 text-sm">
          <li className="flex gap-3">
            <CalendarClock
              className="text-primary mt-0.5 size-4 shrink-0"
              aria-hidden
            />
            <span>
              {t.rich("ends", {
                date: () => (
                  <ClientDate
                    value={trial.endsAt}
                    options={{ day: "numeric", month: "long", year: "numeric" }}
                  />
                ),
                days: trial.daysLeft,
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </span>
          </li>
          <li className="flex gap-3">
            <CreditCard
              className="text-primary mt-0.5 size-4 shrink-0"
              aria-hidden
            />
            <span>{t("noCharge")}</span>
          </li>
          <li className="flex gap-3">
            <ShieldCheck
              className="text-primary mt-0.5 size-4 shrink-0"
              aria-hidden
            />
            <span>{t("afterwards")}</span>
          </li>
        </ul>

        <p className="text-muted-foreground text-xs">{t("whereToSee")}</p>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" asChild>
            <Link href="/pricing" onClick={dismiss}>
              {t("seePlans")}
            </Link>
          </Button>
          <Button onClick={dismiss}>{t("start")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
