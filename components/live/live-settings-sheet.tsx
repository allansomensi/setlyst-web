"use client";

import type { ReactNode } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useTranslations } from "next-intl";
import {
  Contrast,
  Expand,
  ListTree,
  Maximize,
  Metronome,
  Minus,
  Music,
  Pause,
  Play,
  Plus,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LIVE_FONT_FAMILIES,
  type LiveFontFamily,
} from "@/hooks/use-live-display-prefs";
import {
  SCROLL_MAX,
  SCROLL_MIN,
  ZOOM_MAX,
  ZOOM_MIN,
  type LiveControls,
} from "@/hooks/use-live-controls";

const FONT_LABELS: Record<LiveFontFamily, string> = {
  sans: "Sans",
  mono: "Mono",
  serif: "Serif",
};

const FONT_CLASS: Record<LiveFontFamily, string> = {
  sans: "font-sans",
  mono: "font-mono",
  serif: "font-serif",
};

interface LiveSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  controls: LiveControls;
  highContrast: boolean;
  onToggleHighContrast: () => void;
  fitToScreen: boolean;
  onToggleFitToScreen: () => void;
  fontFamily: LiveFontFamily;
  onFontFamilyChange: (font: LiveFontFamily) => void;
  showChords: boolean;
  onToggleChords: () => void;
  showSections: boolean;
  onToggleSections: () => void;
  metronomeRunning: boolean;
  onToggleMetronome: () => void;
  /** The transpose row, rendered by the viewer (it owns that state). */
  transpose: ReactNode;
  /** The metronome row, rendered by the viewer (it owns that state). */
  metronome: ReactNode;
  /** Adds the prev/next keys to the shortcut list (setlist viewer only). */
  hasNavigation?: boolean;
  /**
   * Offered on phones only when the browser supports it (not iOS Safari);
   * larger screens have the button in the header.
   */
  fullscreen?: { active: boolean; onToggle: () => void } | null;
}

/**
 * Live Mode's settings, in one place.
 *
 * These used to live in a stack of floating pills anchored bottom-right
 * that grew sideways as options were added — past the edge of the screen
 * on most phones. Now they are a proper sheet: a bottom sheet on phones
 * (thumb-reachable, full width, scrolls if the phone is short) and a side
 * panel on larger screens, so the song stays visible while text size or
 * contrast is tuned.
 *
 * The things a performer reaches for mid-song — auto-scroll, metronome,
 * chords — are the large toggles at the top; everything set once per gig
 * sits below them. Portalled out of the Live Mode root, so it re-applies
 * the high-contrast scope itself.
 */
export function LiveSettingsSheet({
  open,
  onOpenChange,
  controls,
  highContrast,
  onToggleHighContrast,
  fitToScreen,
  onToggleFitToScreen,
  fontFamily,
  onFontFamilyChange,
  showChords,
  onToggleChords,
  showSections,
  onToggleSections,
  metronomeRunning,
  onToggleMetronome,
  transpose,
  metronome,
  hasNavigation = false,
  fullscreen,
}: LiveSettingsSheetProps) {
  const t = useTranslations("liveMode");

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 fixed inset-0 z-50 bg-black/40 md:bg-black/20" />
        <DialogPrimitive.Content
          data-live-contrast={highContrast ? "high" : undefined}
          className={cn(
            "bg-background text-foreground fixed z-50 flex flex-col shadow-2xl outline-none",
            // Phone: bottom sheet.
            "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl border-t",
            "data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom duration-200",
            // Tablet/desktop: side panel, the song stays in view.
            "md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[400px] md:rounded-none md:border-t-0 md:border-l",
            "md:data-open:slide-in-from-right md:data-closed:slide-out-to-right md:data-open:slide-in-from-bottom-0 md:data-closed:slide-out-to-bottom-0",
          )}
        >
          {/* Grab handle — a visual cue that this is a sheet. */}
          <div className="flex justify-center pt-2 md:hidden" aria-hidden>
            <span className="bg-muted-foreground/30 h-1 w-10 rounded-full" />
          </div>

          <div className="flex items-center justify-between gap-2 px-4 pt-2 pb-3 md:px-5 md:pt-5">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-base font-semibold">
                {t("sheet.title")}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-muted-foreground text-xs">
                {t("sheet.description")}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0"
                aria-label={t("sheet.close")}
              >
                <X className="h-5 w-5" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:px-5">
            {/* Mid-song controls */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              <QuickToggle
                icon={controls.isAutoScroll ? Pause : Play}
                label={t("sheet.autoScroll")}
                active={controls.isAutoScroll}
                disabled={fitToScreen}
                onClick={controls.toggleAutoScroll}
                hint={fitToScreen ? t("sheet.autoScrollFitHint") : undefined}
              />
              <QuickToggle
                icon={Metronome}
                label={t("sheet.metronome")}
                active={metronomeRunning}
                onClick={onToggleMetronome}
              />
              <QuickToggle
                icon={Music}
                label={t("sheet.chords")}
                active={showChords}
                onClick={onToggleChords}
              />
              <QuickToggle
                icon={ListTree}
                label={t("sheet.sections")}
                active={showSections}
                onClick={onToggleSections}
              />
            </div>

            <Section title={t("sheet.text")}>
              <Row label={t("sheet.size")}>
                <Stepper
                  value={`${Math.round(controls.zoomLevel * 100)}%`}
                  onDecrease={() => controls.stepZoom(-1)}
                  onIncrease={() => controls.stepZoom(1)}
                  canDecrease={controls.zoomLevel > ZOOM_MIN}
                  canIncrease={controls.zoomLevel < ZOOM_MAX}
                  decreaseLabel={t("settings.decreaseSize")}
                  increaseLabel={t("settings.increaseSize")}
                />
              </Row>
              <Row label={t("settings.fontLabel")}>
                <div
                  role="radiogroup"
                  aria-label={t("settings.fontLabel")}
                  className="bg-muted flex rounded-lg p-1"
                >
                  {LIVE_FONT_FAMILIES.map((font) => (
                    <button
                      key={font}
                      type="button"
                      role="radio"
                      aria-checked={fontFamily === font}
                      onClick={() => onFontFamilyChange(font)}
                      className={cn(
                        "h-8 rounded-md px-3 text-xs font-medium transition-colors",
                        FONT_CLASS[font],
                        fontFamily === font
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {FONT_LABELS[font]}
                    </button>
                  ))}
                </div>
              </Row>
              {!fitToScreen && (
                <Row label={t("sheet.scrollSpeed")}>
                  <Stepper
                    value={`${controls.scrollSpeed.toFixed(2).replace(/0$/, "")}×`}
                    onDecrease={() => controls.stepScrollSpeed(-1)}
                    onIncrease={() => controls.stepScrollSpeed(1)}
                    canDecrease={controls.scrollSpeed > SCROLL_MIN}
                    canIncrease={controls.scrollSpeed < SCROLL_MAX}
                    decreaseLabel={t("settings.decreaseSpeed")}
                    increaseLabel={t("settings.increaseSpeed")}
                  />
                </Row>
              )}
            </Section>

            <Section title={t("sheet.display")}>
              <SwitchRow
                icon={Contrast}
                label={t("display.highContrast")}
                description={t("display.highContrastHelp")}
                checked={highContrast}
                onToggle={onToggleHighContrast}
              />
              <SwitchRow
                icon={Expand}
                label={t("display.fitToScreen")}
                description={t("display.fitToScreenHelp")}
                checked={fitToScreen}
                onToggle={onToggleFitToScreen}
              />
              {fullscreen && (
                <div className="md:hidden">
                  <SwitchRow
                    icon={Maximize}
                    label={t("fullscreen")}
                    description={t("sheet.fullscreenHelp")}
                    checked={fullscreen.active}
                    onToggle={fullscreen.onToggle}
                  />
                </div>
              )}
            </Section>

            <Section title={t("sheet.transpose")}>{transpose}</Section>

            <Section title={t("sheet.metronome")}>{metronome}</Section>

            {/* Keyboards are a desktop/tablet-with-keyboard thing. */}
            <Section
              title={t("sheet.shortcuts")}
              className="hidden [@media(pointer:fine)]:block"
            >
              <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-sm">
                {hasNavigation && (
                  <Shortcut keys={["←", "→"]} label={t("sheet.keyNav")} />
                )}
                <Shortcut keys={["Space"]} label={t("sheet.keyScroll")} />
                <Shortcut keys={["+", "−"]} label={t("sheet.keySpeed")} />
                <Shortcut keys={["M"]} label={t("sheet.keyMetronome")} />
                <Shortcut keys={["C"]} label={t("sheet.keyChords")} />
                <Shortcut keys={["S"]} label={t("sheet.keySections")} />
                <Shortcut keys={[",", "."]} label={t("sheet.keyTranspose")} />
              </dl>
            </Section>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <h3 className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-10 items-center justify-between gap-3">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </div>
  );
}

function Stepper({
  value,
  onDecrease,
  onIncrease,
  canDecrease,
  canIncrease,
  decreaseLabel,
  increaseLabel,
}: {
  value: string;
  onDecrease: () => void;
  onIncrease: () => void;
  canDecrease: boolean;
  canIncrease: boolean;
  decreaseLabel: string;
  increaseLabel: string;
}) {
  return (
    <div className="flex items-center rounded-lg border">
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10"
        onClick={onDecrease}
        disabled={!canDecrease}
        aria-label={decreaseLabel}
        title={decreaseLabel}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <span
        className="w-14 text-center font-mono text-sm font-semibold tabular-nums"
        aria-live="polite"
      >
        {value}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10"
        onClick={onIncrease}
        disabled={!canIncrease}
        aria-label={increaseLabel}
        title={increaseLabel}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

function QuickToggle({
  icon: Icon,
  label,
  active,
  disabled,
  onClick,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      title={hint}
      className={cn(
        "flex h-20 flex-col items-center justify-center gap-1.5 rounded-xl border px-1 text-center text-[11px] font-medium transition-colors sm:text-xs",
        "focus-visible:ring-ring/50 outline-none focus-visible:ring-3",
        "disabled:pointer-events-none disabled:opacity-40",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-muted/40 hover:bg-muted",
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="leading-tight">{label}</span>
    </button>
  );
}

function SwitchRow({
  icon: Icon,
  label,
  description,
  checked,
  onToggle,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className="hover:bg-muted/50 focus-visible:ring-ring/50 -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors outline-none focus-visible:ring-3"
    >
      <Icon className="text-muted-foreground h-5 w-5 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="text-muted-foreground block text-xs leading-snug">
          {description}
        </span>
      </span>
      <span
        aria-hidden
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-primary" : "bg-muted-foreground/30",
        )}
      >
        <span
          className={cn(
            "bg-background absolute h-5 w-5 rounded-full shadow transition-transform",
            checked ? "translate-x-5.5" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}

function Shortcut({ keys, label }: { keys: string[]; label: string }) {
  return (
    <>
      <dt className="flex gap-1">
        {keys.map((key) => (
          <kbd
            key={key}
            className="bg-muted min-w-7 rounded border px-1.5 py-0.5 text-center font-mono text-[11px]"
          >
            {key}
          </kbd>
        ))}
      </dt>
      <dd className="text-muted-foreground">{label}</dd>
    </>
  );
}
