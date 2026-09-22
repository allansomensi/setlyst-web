"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { updatePreferences } from "../actions";
import { FONT_SIZE_PRESETS, normalizeFontSize } from "@/lib/preferences";
import { UserPreferences, UserTheme } from "@/types/api";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Save,
  Loader2,
  Globe,
  Palette,
  Type,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { toastActionError } from "@/lib/action-toast";
import { cn } from "@/lib/utils";

interface SettingsFormProps {
  initialPreferences: UserPreferences;
}

export function SettingsForm({ initialPreferences }: SettingsFormProps) {
  const t = useTranslations("settings");
  const router = useRouter();
  const pathname = usePathname();
  const { update: updateSession } = useSession();
  const { setTheme } = useTheme();
  const [isPending, startTransition] = useTransition();
  const [fontSize, setFontSize] = useState(() =>
    normalizeFontSize(initialPreferences.live_mode_font_size),
  );

  const handleAction = (formData: FormData) => {
    const languageValue = formData.get("language");
    const themeValue = formData.get("theme");

    const language = typeof languageValue === "string" ? languageValue : "en";

    const theme = (
      ["light", "dark", "system"].includes(themeValue as string)
        ? themeValue
        : "system"
    ) as UserTheme;

    const payload = {
      language,
      theme,
      live_mode_font_size: fontSize,
    };

    startTransition(async () => {
      const result = await updatePreferences(payload);

      if (!result.success) {
        toastActionError(
          result,
          result.error || "Failed to update preferences",
        );
        return;
      }

      setTheme(payload.theme);
      toast.success(t("saveSuccess") || "Preferences updated");

      // Keep the language on the session token in step with what was just
      // saved. The token is what decides the locale when the app is opened
      // at a URL with no locale in it — an installed PWA's start_url, say
      // — so leaving it stale here would send the person back to their
      // previous language on the next launch. See lib/auth.ts.
      await updateSession({ language: payload.language });

      if (payload.language !== initialPreferences.language) {
        router.replace(pathname, { locale: payload.language });
      } else {
        router.refresh();
      }
    });
  };

  return (
    <form
      action={handleAction}
      className={cn(
        "mx-auto w-full max-w-3xl space-y-6 transition-opacity duration-200",
        isPending && "pointer-events-none opacity-60",
      )}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SlidersHorizontal className="text-primary h-4 w-4" />
            {t("generalTitle")}
          </CardTitle>
          <CardDescription>{t("generalDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2.5">
              <Label
                htmlFor="language"
                className="text-foreground/90 font-medium"
              >
                {t("language")}
              </Label>
              <div className="relative w-full">
                <Globe className="text-muted-foreground absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2" />
                <Select
                  name="language"
                  defaultValue={initialPreferences.language || "en"}
                  disabled={isPending}
                >
                  <SelectTrigger
                    id="language"
                    className="bg-background hover:bg-accent/50 w-full pl-9 transition-colors"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="theme" className="text-foreground/90 font-medium">
                {t("theme")}
              </Label>
              <div className="relative w-full">
                <Palette className="text-muted-foreground absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2" />
                <Select
                  name="theme"
                  defaultValue={initialPreferences.theme || "system"}
                  disabled={isPending}
                >
                  <SelectTrigger
                    id="theme"
                    className="bg-background hover:bg-accent/50 w-full pl-9 transition-colors"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">{t("themeLight")}</SelectItem>
                    <SelectItem value="dark">{t("themeDark")}</SelectItem>
                    <SelectItem value="system">{t("themeSystem")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="text-primary h-4 w-4" />
            {t("liveModeFontSize")}
          </CardTitle>
          <CardDescription>{t("liveModeFontSizeHelp")}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* A radiogroup rather than plain buttons: these are mutually
              exclusive choices, so arrow-key navigation and the selected
              state need to be exposed to assistive tech, which a row of
              <button>s doesn't do on its own. */}
          <div
            role="radiogroup"
            aria-label={t("liveModeFontSize")}
            className="flex flex-wrap items-center gap-2"
          >
            {FONT_SIZE_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                role="radio"
                aria-checked={fontSize === preset}
                disabled={isPending}
                onClick={() => setFontSize(preset)}
                className={cn(
                  "focus-visible:ring-ring rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
                  fontSize === preset
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:bg-accent/50 border-input",
                )}
              >
                {preset}%
              </button>
            ))}
          </div>
        </CardContent>

        <CardFooter className="justify-end">
          <Button
            type="submit"
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {t("save")}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
