"use client";

import { useTranslations } from "next-intl";
import { Contrast, Expand } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DisplayControlsProps {
  highContrast: boolean;
  onToggleHighContrast: () => void;
  fitToScreen: boolean;
  onToggleFitToScreen: () => void;
}

/**
 * The Live Mode display toggles — high contrast and whole-song-on-one-
 * screen. Their own row above the settings pill, like transpose and the
 * metronome, because the pill is already full at phone width. Both are
 * real toggles (`aria-pressed`), labelled in text on wider screens and by
 * `title`/`aria-label` on phones.
 */
export function DisplayControls({
  highContrast,
  onToggleHighContrast,
  fitToScreen,
  onToggleFitToScreen,
}: DisplayControlsProps) {
  const t = useTranslations("liveMode.display");

  return (
    <div className="bg-card/90 flex items-center gap-1.5 rounded-xl border p-1 shadow-2xl backdrop-blur-lg md:gap-2 md:p-2">
      <Button
        variant={highContrast ? "default" : "outline"}
        size="sm"
        onClick={onToggleHighContrast}
        aria-pressed={highContrast}
        aria-label={t("highContrast")}
        title={t("highContrastHelp")}
        className="h-8 gap-1.5 px-2 md:h-9 md:px-3"
      >
        <Contrast className="h-3.5 w-3.5 md:h-4 md:w-4" />
        <span className="hidden text-xs sm:inline">{t("highContrast")}</span>
      </Button>

      <Button
        variant={fitToScreen ? "default" : "outline"}
        size="sm"
        onClick={onToggleFitToScreen}
        aria-pressed={fitToScreen}
        aria-label={t("fitToScreen")}
        title={t("fitToScreenHelp")}
        className="h-8 gap-1.5 px-2 md:h-9 md:px-3"
      >
        <Expand className="h-3.5 w-3.5 md:h-4 md:w-4" />
        <span className="hidden text-xs sm:inline">{t("fitToScreen")}</span>
      </Button>
    </div>
  );
}
