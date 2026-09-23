"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { MonitorSmartphone, MonitorPlay, RotateCcw, Rows3 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useUiSettings } from "@/components/providers/ui-settings-provider";
import {
  hasLiveDeviceOverride,
  resetLiveDeviceOverride,
} from "@/hooks/use-live-display-prefs";
import {
  hasPageSizeDeviceOverride,
  resetPageSizeDeviceOverride,
} from "@/hooks/use-page-size";
import { toastActionError } from "@/lib/action-toast";
import {
  LIVE_FONT_FAMILIES,
  PAGE_SIZE_OPTIONS,
  type LiveDefaults,
  type LiveFontFamily,
} from "@/lib/ui-settings";

const subscribeNever = () => () => {};

const LIVE_SWITCHES = [
  "showChords",
  "showSections",
  "fitToScreen",
  "highContrast",
] as const;

/**
 * Account-wide display defaults: how Live Mode opens and how long lists
 * are, on every device. Each change saves immediately.
 */
export function DisplayDefaultsSection() {
  const t = useTranslations("settings.display");
  const { settings, update } = useUiSettings();
  const [isPending, startTransition] = useTransition();
  // Bumped after a reset so the snapshot below is read again.
  const [, setResetCount] = useState(0);
  // localStorage only exists in the browser; the server render says "no".
  const deviceOverride = useSyncExternalStore(
    subscribeNever,
    () => hasLiveDeviceOverride() || hasPageSizeDeviceOverride(),
    () => false,
  );

  const saveLive = (patch: Partial<LiveDefaults>) => {
    startTransition(async () => {
      const result = await update({ live: { ...settings.live, ...patch } });
      if (!result.success) toastActionError(result, result.error);
      else toast.success(t("saved"), { id: "display-defaults-saved" });
    });
  };

  const savePageSize = (pageSize: number) => {
    startTransition(async () => {
      const result = await update({ lists: { pageSize } });
      if (!result.success) toastActionError(result, result.error);
      else toast.success(t("saved"), { id: "display-defaults-saved" });
    });
  };

  const resetDevice = () => {
    resetLiveDeviceOverride();
    resetPageSizeDeviceOverride();
    setResetCount((n) => n + 1);
    toast.success(t("deviceReset"));
  };

  return (
    <Card id="display">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MonitorPlay className="text-primary h-4 w-4" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-2 sm:grid-cols-2">
          {LIVE_SWITCHES.map((key) => (
            <label
              key={key}
              className="hover:bg-muted/50 flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium">
                  {t(`live.${key}`)}
                </span>
                <span className="text-muted-foreground block text-xs">
                  {t(`live.${key}Hint`)}
                </span>
              </span>
              <Switch
                checked={settings.live[key]}
                onCheckedChange={(value) => saveLive({ [key]: value })}
                disabled={isPending}
              />
            </label>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("live.fontFamily")}</Label>
            <Select
              value={settings.live.fontFamily}
              onValueChange={(value) =>
                saveLive({ fontFamily: value as LiveFontFamily })
              }
              disabled={isPending}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LIVE_FONT_FAMILIES.map((family) => (
                  <SelectItem key={family} value={family}>
                    {t(`live.fonts.${family}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Rows3 className="h-3.5 w-3.5" />
              {t("pageSize")}
            </Label>
            <Select
              value={String(settings.lists.pageSize)}
              onValueChange={(value) => savePageSize(Number(value))}
              disabled={isPending}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {t("pageSizeOption", { count: size })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-muted/40 flex flex-col gap-2 rounded-lg p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground flex items-start gap-2">
            <MonitorSmartphone className="mt-0.5 h-4 w-4 shrink-0" />
            {deviceOverride ? t("deviceOverride") : t("deviceFollows")}
          </p>
          {deviceOverride && (
            <Button variant="outline" size="sm" onClick={resetDevice}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              {t("resetDevice")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
