"use client";

import { useState, useTransition, type FormEvent } from "react";
import { LOCALE_NAMES } from "@/i18n/locales";
import { routing, useRouter, usePathname } from "@/i18n/routing";
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
import { toast } from "@/lib/toast";
import { toastActionError } from "@/lib/action-toast";
import { cn } from "@/lib/utils";

interface SettingsFormProps {
  initialPreferences: UserPreferences;
}

const THEMES: UserTheme[] = ["light", "dark", "system"];

function isUserTheme(value: string): value is UserTheme {
  return (THEMES as string[]).includes(value);
}

export function SettingsForm({ initialPreferences }: SettingsFormProps) {
  const t = useTranslations("settings");
  const router = useRouter();
  const pathname = usePathname();
  const { update: updateSession } = useSession();
  const { setTheme } = useTheme();
  const [isPending, startTransition] = useTransition();
  const [isSavingTheme, startSavingTheme] = useTransition();
  const [language, setLanguage] = useState(initialPreferences.language || "en");
  const [theme, setThemeChoice] = useState<UserTheme>(
    initialPreferences.theme || "system",
  );
  const [fontSize, setFontSize] = useState(() =>
    normalizeFontSize(initialPreferences.live_mode_font_size),
  );

  /**
   * The theme applies the moment it's picked and is saved right away, so
   * there's no "preview until you press Save" state to explain.
   */
  const changeTheme = (value: string) => {
    if (!isUserTheme(value) || value === theme) return;
    const previous = theme;
    setThemeChoice(value);
    setTheme(value);
    startSavingTheme(async () => {
      const result = await updatePreferences({ theme: value });
      if (!result.success) {
        setThemeChoice(previous);
        setTheme(previous);
        toastActionError(result, result.error);
      }
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = { language, theme, live_mode_font_size: fontSize };

    startTransition(async () => {
      const result = await updatePreferences(payload);

      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }

      toast.success(t("saveSuccess"));

      // Keep the language on the session token in step with what was just
      // saved. The token is what decides the locale when the app is opened
      // at a URL with no locale in it (an installed PWA's start_url, say),
      // so leaving it stale here would send the person back to their
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
      onSubmit={handleSubmit}
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
                  value={language}
                  onValueChange={setLanguage}
                  disabled={isPending}
                >
                  <SelectTrigger
                    id="language"
                    className="bg-background hover:bg-accent/50 w-full pl-9 transition-colors"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Each language named in itself (i18n/locales.ts). */}
                    {routing.locales.map((code) => (
                      <SelectItem key={code} value={code} lang={code}>
                        {LOCALE_NAMES[code]}
                      </SelectItem>
                    ))}
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
                  value={theme}
                  onValueChange={changeTheme}
                  disabled={isPending || isSavingTheme}
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
