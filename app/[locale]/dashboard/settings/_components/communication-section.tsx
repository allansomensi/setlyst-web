"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Bell, Lock, Mail, MailWarning, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { updateCommunication } from "@/lib/actions/account";
import { toastActionError } from "@/lib/action-toast";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type {
  CommunicationChannels,
  CommunicationSettings,
} from "@/types/account";
import {
  COMMUNICATION_CATEGORIES,
  type CommunicationCategory,
} from "@/types/public";

type Channel = "email" | "in_app";

/**
 * Which messages arrive by e-mail and in the app, per category. Each
 * switch saves on its own. Security messages can't be turned off.
 */
export function CommunicationSection({
  initial,
}: {
  initial: CommunicationSettings | null;
}) {
  const t = useTranslations("communication");
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (!settings) {
    return (
      <Alert variant="warning">
        <TriangleAlert />
        <AlertDescription>{t("unavailable")}</AlertDescription>
      </Alert>
    );
  }

  const toggle = (
    category: CommunicationCategory,
    channel: Channel,
    value: boolean,
  ) => {
    const current = settings.categories[category];
    if (!current || current.locked) return;
    const next: CommunicationChannels = { ...current, [channel]: value };
    const previous = settings;
    setSettings({
      ...settings,
      categories: { ...settings.categories, [category]: next },
    });
    setSaving(`${category}.${channel}`);
    startTransition(async () => {
      const result = await updateCommunication({
        [category]: { email: next.email, in_app: next.in_app },
      });
      setSaving(null);
      if (!result.success) {
        setSettings(previous);
        toastActionError(result, result.error);
        return;
      }
      if (result.data) setSettings(result.data);
      toast.success(t("saved"), { id: "communication-saved" });
    });
  };

  const emailsBlocked = !settings.email || !settings.email_verified;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="text-primary size-4" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {emailsBlocked && (
          <Alert variant="warning">
            <MailWarning />
            <AlertDescription>
              {settings.email ? t("emailUnverified") : t("emailMissing")}
            </AlertDescription>
          </Alert>
        )}

        <div className="overflow-hidden rounded-lg border">
          <div className="bg-muted/60 text-muted-foreground grid grid-cols-[1fr_4rem_4rem] items-center gap-2 px-4 py-2 text-xs font-medium sm:grid-cols-[1fr_5.5rem_5.5rem]">
            <span>{t("category")}</span>
            <span className="flex items-center justify-center gap-1">
              <Mail className="size-3.5" aria-hidden />
              {t("email")}
            </span>
            <span className="flex items-center justify-center gap-1">
              <Bell className="size-3.5" aria-hidden />
              {t("inApp")}
            </span>
          </div>
          <ul className="divide-y">
            {COMMUNICATION_CATEGORIES.map((category) => {
              const prefs = settings.categories[category];
              if (!prefs) return null;
              const label = t(`categories.${category}.label`);
              return (
                <li
                  key={category}
                  className="grid grid-cols-[1fr_4rem_4rem] items-center gap-2 px-4 py-3 sm:grid-cols-[1fr_5.5rem_5.5rem]"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      {label}
                      {prefs.locked && (
                        <Lock
                          className="text-muted-foreground size-3.5"
                          aria-label={t("locked")}
                        />
                      )}
                      {category === "marketing" && (
                        <span className="text-muted-foreground text-xs font-normal">
                          {t("optional")}
                        </span>
                      )}
                    </p>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {t(`categories.${category}.description`)}
                    </p>
                  </div>
                  {(["email", "in_app"] as const).map((channel) => (
                    <div key={channel} className="flex justify-center">
                      <Switch
                        checked={prefs[channel]}
                        disabled={
                          prefs.locked || saving === `${category}.${channel}`
                        }
                        onCheckedChange={(value) =>
                          toggle(category, channel, value)
                        }
                        aria-label={t("switchLabel", {
                          category: label,
                          channel:
                            channel === "email" ? t("email") : t("inApp"),
                        })}
                        className={cn(prefs.locked && "opacity-60")}
                      />
                    </div>
                  ))}
                </li>
              );
            })}
          </ul>
        </div>
        <p className="text-muted-foreground flex items-start gap-2 text-xs">
          <Lock className="mt-0.5 size-3.5 shrink-0" />
          {t("securityNote")}
        </p>
      </CardContent>
    </Card>
  );
}
