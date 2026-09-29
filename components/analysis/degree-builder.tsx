"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  NUMERALS,
  emptyDegree,
  formatDegree,
  parseDegree,
  type Accidental,
  type Degree,
} from "@/lib/music/analysis";
import { DegreeText } from "./analysis-marks";

/** One-tap degrees of a major key: the diatonic chords and the usual secondary dominants. */
const MAJOR_PRESETS = [
  "I7M",
  "IIm7",
  "IIIm7",
  "IV7M",
  "V7",
  "VIm7",
  "VIIm7(b5)",
  "V7/II",
  "V7/III",
  "V7/IV",
  "V7/V",
  "V7/VI",
  "SubV7",
  "IVm6",
  "bVII7",
  "bVI7M",
] as const;

/** The same for a minor key (harmonic minor's V7 included). */
const MINOR_PRESETS = [
  "Im7",
  "IIm7(b5)",
  "bIII7M",
  "IVm7",
  "V7",
  "Vm7",
  "bVI7M",
  "bVII7",
  "VII°",
  "V7/IV",
  "V7/bVI",
  "SubV7",
] as const;

const QUALITIES = [
  "",
  "7M",
  "6",
  "7",
  "m",
  "m7",
  "m6",
  "m7(b5)",
  "°",
  "7(9)",
  "7(b9)",
  "7(#11)",
  "7(13)",
  "7(b13)",
  "7sus4",
  "m7M",
  "7M(9)",
  "m7(9)",
  "+",
] as const;

const TARGETS = [
  "",
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "bIII",
  "bVI",
  "bVII",
] as const;

function Chip({
  active,
  children,
  onClick,
  className,
  label,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "focus-visible:ring-ring inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-sm transition-colors outline-none focus-visible:ring-2",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-background hover:bg-muted",
        className,
      )}
    >
      {children}
    </button>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-muted-foreground text-[0.7rem] font-semibold tracking-wide uppercase">
        {label}
      </p>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

const pretty = (value: string) =>
  value.replace(/b(?=[IV\d])/g, "♭").replace(/#/g, "♯");

/**
 * Writing a degree: type it ("V7/II", "SubV7", "bVII7"), tap a common
 * one, or build it piece by piece — accidental, numeral, quality, and
 * the target of a secondary dominant. All three edit the same value.
 */
export function DegreeBuilder({
  value,
  minor,
  onChange,
}: {
  value: Degree | null;
  /** The key in force is minor: offer the minor-key presets. */
  minor: boolean;
  onChange: (degree: Degree | null) => void;
}) {
  const t = useTranslations("analysis.degree");
  const current = value ?? emptyDegree();
  const formatted = formatDegree(value);
  // What's typed, kept while it doesn't parse yet ("Su", "V7/").
  const [draft, setDraft] = useState<{ for: string; text: string } | null>(
    null,
  );
  const text = draft && draft.for === formatted ? draft.text : formatted;
  const invalid = text.trim() !== "" && parseDegree(text) === null;

  const patch = (next: Partial<Degree>) => {
    const degree = { ...current, ...next };
    onChange(degree.numeral ? degree : null);
  };

  const presets = minor ? MINOR_PRESETS : MAJOR_PRESETS;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            value={text}
            onChange={(event) => {
              const next = event.target.value;
              const parsed = parseDegree(next);
              if (!next.trim()) {
                setDraft(null);
                onChange(null);
                return;
              }
              if (parsed) {
                setDraft({ for: formatDegree(parsed), text: next });
                onChange(parsed);
              } else {
                setDraft({ for: formatted, text: next });
              }
            }}
            placeholder={t("placeholder")}
            aria-label={t("input")}
            aria-invalid={invalid || undefined}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            className="h-10 pr-9 font-mono"
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                setDraft(null);
                onChange(null);
              }}
              aria-label={t("clear")}
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 outline-none focus-visible:ring-3"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
        <div
          className="bg-muted/50 flex h-10 min-w-20 items-center justify-center rounded-md border px-2 text-lg"
          aria-hidden
        >
          {value ? (
            <DegreeText degree={value} />
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      </div>
      {invalid && <p className="text-destructive text-xs">{t("invalid")}</p>}

      <Row label={minor ? t("presetsMinor") : t("presetsMajor")}>
        {presets.map((preset) => {
          const degree = parseDegree(preset);
          const active = formatted === preset;
          return (
            <Chip
              key={preset}
              active={active}
              onClick={() => {
                setDraft(null);
                onChange(active ? null : degree);
              }}
              className="font-serif font-semibold"
            >
              {pretty(preset)}
            </Chip>
          );
        })}
      </Row>

      <details className="group rounded-lg border">
        <summary className="hover:bg-muted/50 cursor-pointer list-none rounded-lg px-3 py-2 text-sm font-medium select-none">
          {t("build")}
        </summary>
        <div className="space-y-3 border-t p-3">
          <Row label={t("numeral")}>
            {(["b", "", "#"] as Accidental[]).map((accidental) => (
              <Chip
                key={accidental || "natural"}
                active={current.accidental === accidental && !!current.numeral}
                onClick={() =>
                  patch({ accidental, numeral: current.numeral || "I" })
                }
                label={t(
                  `accidental.${accidental === "b" ? "flat" : accidental === "#" ? "sharp" : "natural"}`,
                )}
              >
                {accidental === "b" ? "♭" : accidental === "#" ? "♯" : "♮"}
              </Chip>
            ))}
            <span className="w-2" />
            {NUMERALS.map((numeral) => (
              <Chip
                key={numeral}
                active={current.numeral === numeral}
                onClick={() => patch({ numeral })}
                className="font-serif font-bold"
              >
                {numeral}
              </Chip>
            ))}
          </Row>

          <Row label={t("quality")}>
            {QUALITIES.map((quality) => (
              <Chip
                key={quality || "triad"}
                active={!!current.numeral && current.quality === quality}
                onClick={() =>
                  patch({ quality, numeral: current.numeral || "I" })
                }
                label={quality ? undefined : t("majorTriad")}
              >
                {quality ? pretty(quality) : t("triad")}
              </Chip>
            ))}
          </Row>

          <Row label={t("target")}>
            {TARGETS.map((target) => (
              <Chip
                key={target || "none"}
                active={!!current.numeral && current.target === target}
                onClick={() =>
                  patch({ target, numeral: current.numeral || "V" })
                }
                className={target ? "font-serif font-semibold" : undefined}
              >
                {target ? `/${pretty(target)}` : t("noTarget")}
              </Chip>
            ))}
          </Row>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="accent-primary h-4 w-4"
              checked={current.sub}
              onChange={(event) =>
                patch({
                  sub: event.target.checked,
                  numeral: current.numeral || "V",
                })
              }
            />
            <span>
              {t("sub")}
              <span className="text-muted-foreground ml-1 text-xs">
                {t("subHint")}
              </span>
            </span>
          </label>
        </div>
      </details>
    </div>
  );
}
