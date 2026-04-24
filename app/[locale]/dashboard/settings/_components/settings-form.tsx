"use client";

import { useTransition } from "react";
import { useRouter, usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { updatePreferences } from "../actions";
import { UserPreferences, UserTheme } from "@/types/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Save, Loader2, Globe, Palette, Type, Percent } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SettingsFormProps {
  initialPreferences: UserPreferences;
}

export function SettingsForm({ initialPreferences }: SettingsFormProps) {
  const t = useTranslations("settings");
  const router = useRouter();
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const [isPending, startTransition] = useTransition();

  const handleAction = (formData: FormData) => {
    const languageValue = formData.get("language");
    const themeValue = formData.get("theme");
    const fontSizeValue = formData.get("live_mode_font_size");

    const language = typeof languageValue === "string" ? languageValue : "en";

    const theme = (
      ["light", "dark", "system"].includes(themeValue as string)
        ? themeValue
        : "system"
    ) as UserTheme;

    const rawFontSize = parseInt(fontSizeValue as string);
    const safeFontSize = isNaN(rawFontSize)
      ? 100
      : Math.min(Math.max(rawFontSize, 50), 300);

    const payload = {
      language,
      theme,
      live_mode_font_size: safeFontSize,
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
      className="mx-auto w-full max-w-3xl px-4 sm:px-0"
    >
      <Card
        className={cn(
          "md:bg-card border-none bg-transparent shadow-none transition-opacity duration-200 md:border md:shadow-sm",
          isPending && "pointer-events-none opacity-60",
        )}
      >
        <CardContent className="space-y-6 p-2 sm:space-y-8 sm:p-6 md:p-8">
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

          <div className="space-y-2.5">
            <Label
              htmlFor="live_mode_font_size"
              className="text-foreground/90 font-medium"
            >
              {t("liveModeFontSize")}
            </Label>
            <div className="relative w-full sm:max-w-[16rem]">
              <Type className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                id="live_mode_font_size"
                name="live_mode_font_size"
                type="number"
                min={50}
                max={300}
                defaultValue={initialPreferences.live_mode_font_size || 100}
                disabled={isPending}
                className="hover:border-primary/50 w-full pr-9 pl-9 transition-colors"
              />
              <Percent className="text-muted-foreground absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2" />
            </div>
            <p className="text-muted-foreground text-xs">
              {t("liveModeFontSizeHelp")}
            </p>
          </div>
        </CardContent>

        <CardFooter className="bg-muted/30 flex justify-end rounded-b-lg p-4 pt-6 md:border-t md:px-8 md:py-6">
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
