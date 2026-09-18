"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { updatePreferences } from "../actions";
import { UserPreferences, UserTheme } from "@/types/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Percent,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SettingsFormProps {
  initialPreferences: UserPreferences;
}

const FONT_SIZE_PRESETS = [75, 100, 125, 150, 200];
const FONT_SIZE_MIN = 50;
const FONT_SIZE_MAX = 300;

export function SettingsForm({ initialPreferences }: SettingsFormProps) {
  const t = useTranslations("settings");
  const router = useRouter();
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const [isPending, startTransition] = useTransition();
  const [fontSize, setFontSize] = useState(
    initialPreferences.live_mode_font_size || 100,
  );

  const clampFontSize = (value: number) =>
    Math.min(Math.max(value, FONT_SIZE_MIN), FONT_SIZE_MAX);

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
      live_mode_font_size: clampFontSize(fontSize),
    };

    startTransition(async () => {
      const result = await updatePreferences(payload);

      if (result.success) {
        setTheme(payload.theme);
        toast.success(t("saveSuccess") || "Preferences updated");

        setTimeout(() => {
          if (payload.language !== initialPreferences.language) {
            router.replace(pathname, { locale: payload.language });
          } else {
            router.refresh();
          }
        }, 1200);
      } else {
        toast.error(result.error || "Failed to update preferences");
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
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {FONT_SIZE_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={isPending}
                onClick={() => setFontSize(preset)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  fontSize === preset
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:bg-accent/50 border-input",
                )}
              >
                {preset}%
              </button>
            ))}
          </div>

          <div className="relative w-full sm:max-w-[12rem]">
            <Type className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              id="live_mode_font_size"
              name="live_mode_font_size"
              type="number"
              min={FONT_SIZE_MIN}
              max={FONT_SIZE_MAX}
              value={fontSize}
              onChange={(e) => {
                const parsed = parseInt(e.target.value, 10);
                setFontSize(Number.isNaN(parsed) ? FONT_SIZE_MIN : parsed);
              }}
              onBlur={() => setFontSize((prev) => clampFontSize(prev))}
              disabled={isPending}
              className="hover:border-primary/50 w-full pr-9 pl-9 transition-colors"
            />
            <Percent className="text-muted-foreground absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2" />
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
