"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { ChordDiagram } from "@/components/chords/chord-diagram";
import { useChordDiagramPrefs } from "@/hooks/use-chord-diagram-prefs";
import { CHORD_INSTRUMENTS, type ChordInstrument } from "@/lib/ui-settings";
import { cn } from "@/lib/utils";

/**
 * The instrument switch shown with a diagram. Picking one saves it as the
 * preference (see useChordDiagramPrefs), so the next chord opens there.
 */
export function InstrumentPicker({
  value,
  onChange,
  className,
}: {
  value: ChordInstrument;
  onChange: (instrument: ChordInstrument) => void;
  className?: string;
}) {
  const t = useTranslations("chordDiagram.instruments");
  return (
    <div
      role="radiogroup"
      aria-label={t("label")}
      className={cn(
        "bg-muted grid grid-cols-4 gap-0.5 rounded-lg p-0.5",
        className,
      )}
    >
      {CHORD_INSTRUMENTS.map((instrument) => (
        <button
          key={instrument}
          type="button"
          role="radio"
          aria-checked={value === instrument}
          onClick={() => onChange(instrument)}
          className={cn(
            "focus-visible:ring-ring rounded-md px-1.5 py-1 text-[0.7rem] font-medium transition-colors outline-none focus-visible:ring-2",
            value === instrument
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t(instrument)}
        </button>
      ))}
    </div>
  );
}

/** A chord's diagram with the instrument switch: the popover's body. */
export function ChordDiagramCard({
  symbol,
  className,
}: {
  symbol: string;
  className?: string;
}) {
  const [prefs, setPrefs] = useChordDiagramPrefs();
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-mono text-xl font-bold tracking-tight">{symbol}</p>
      </div>
      <InstrumentPicker
        value={prefs.instrument}
        onChange={(instrument) => setPrefs({ instrument })}
      />
      <ChordDiagram
        symbol={symbol}
        instrument={prefs.instrument}
        leftHanded={prefs.leftHanded}
      />
    </div>
  );
}

interface Target {
  symbol: string;
  element: HTMLElement;
}

/** The chord a click or key press landed on, if any. */
function chordTarget(
  event: React.SyntheticEvent,
  root: HTMLElement,
): Target | null {
  const element = (event.target as HTMLElement | null)?.closest<HTMLElement>(
    "[data-chord-symbol]",
  );
  if (!element || !root.contains(element)) return null;
  const symbol = element.dataset.chordSymbol;
  return symbol ? { symbol, element } : null;
}

/**
 * Makes every chord rendered inside it (ChordProRenderer with
 * `interactiveChords`) open its diagram when clicked or activated with
 * the keyboard. One popover for the whole chart, anchored to the chord.
 */
export function ChordDiagramHost({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [open, setOpen] = useState(false);

  const anchorRef = useMemo(
    () => ({
      current: {
        getBoundingClientRect: () =>
          target?.element.getBoundingClientRect() ?? new DOMRect(),
      },
    }),
    [target],
  );

  const show = useCallback((next: Target) => {
    setTarget(next);
    setOpen(true);
  }, []);

  const onClick = (event: React.MouseEvent) => {
    if (!rootRef.current) return;
    const next = chordTarget(event, rootRef.current);
    if (!next) return;
    event.stopPropagation();
    show(next);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (!rootRef.current) return;
    const next = chordTarget(event, rootRef.current);
    if (!next) return;
    event.preventDefault();
    event.stopPropagation();
    show(next);
  };

  return (
    <div
      ref={rootRef}
      className={className}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      {children}
      <Popover
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) target?.element.focus({ preventScroll: true });
        }}
      >
        <PopoverAnchor virtualRef={anchorRef} />
        {target && (
          <PopoverContent
            side="bottom"
            align="center"
            collisionPadding={12}
            className="w-[17.5rem] p-3"
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            <ChordDiagramCard key={target.symbol} symbol={target.symbol} />
          </PopoverContent>
        )}
      </Popover>
    </div>
  );
}
