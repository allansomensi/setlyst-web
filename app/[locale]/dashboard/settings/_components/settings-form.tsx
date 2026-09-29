"use client";

import { useState, useTransition } from "react";
import { LOCALE_NAMES, isAppLocale } from "@/i18n/locales";
import { routing, useRouter, usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { updatePreferences } from "../actions";
import { FONT_SIZE_PRESETS, normalizeFontSize } from "@/lib/preferences";
import { UserPreferences, UserTheme } from "@/types/api";

import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
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

import { Loader2, Globe, Palette, Type, SlidersHorizontal } from "lucide-react";
import { toastActionError } from "@/lib/action-toast";
import { cn } from "@/lib/utils";
import { onRadioGroupKeyDown } from "@/hooks/radio-group-keys";

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
  const [isSavingLanguage, startSavingLanguage] = useTransition();
  const [isSavingTheme, startSavingTheme] = useTransition();
  const [isSavingFontSize, startSavingFontSize] = useTransition();
  const [language, setLanguage] = useState(initialPreferences.language || "en");
  const [theme, setThemeChoice] = useState<UserTheme>(
    initialPreferences.theme || "system",
  );
  const [fontSize, setFontSize] = useState(() =>
    normalizeFontSize(initialPreferences.live_mode_font_size),
  );

  /**
   * Every preference applies and is saved the moment it's picked, so
   * there's no "preview until you press Save" state to explain. A failed
   * save puts the previous choice back.
   */
  const changeLanguage = (value: string) => {
    if (!isAppLocale(value) || value === language) return;
    const previous = language;
    setLanguage(value);
    startSavingLanguage(async () => {
      const result = await updatePreferences({ language: value });
      if (!result.success) {
        setLanguage(previous);
        toastActionError(result, result.error);
        return;
      }

      // Keep the language on the session token in step with what was just
      // saved: the token is what decides the locale of every signed-in
      // page (see proxy.ts), so leaving it stale would send the person
      // straight back to the previous language. See lib/auth.ts.
      await updateSession({ language: value });
      router.replace(pathname, { locale: value });
    });
  };

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

  const changeFontSize = (value: number) => {
    if (value === fontSize) return;
    const previous = fontSize;
    setFontSize(value);
    startSavingFontSize(async () => {
      const result = await updatePreferences({ live_mode_font_size: value });
      if (!result.success) {
        setFontSize(previous);
        toastActionError(result, result.error);
      }
    });
  };

  return (
    <div
      className={cn(
        "w-full space-y-6 transition-opacity duration-200",
        isSavingLanguage && "pointer-events-none opacity-60",
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
                  onValueChange={changeLanguage}
                  disabled={isSavingLanguage}
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
                  disabled={isSavingLanguage || isSavingTheme}
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
            onKeyDown={onRadioGroupKeyDown}
            aria-label={t("liveModeFontSize")}
            className="flex flex-wrap items-center gap-2"
          >
            {FONT_SIZE_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                role="radio"
                aria-checked={fontSize === preset}
                disabled={isSavingLanguage}
                onClick={() => changeFontSize(preset)}
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
            {isSavingFontSize && (
              <Loader2
                aria-hidden
                className="text-muted-foreground h-4 w-4 animate-spin"
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
