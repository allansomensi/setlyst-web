"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { onRadioGroupKeyDown } from "@/hooks/radio-group-keys";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  KEY_NAMES,
  isMinorKey,
  parseDegree,
  type Degree,
} from "@/lib/music/analysis";
import {
  chordShape,
  fieldsFor,
  harmonicField,
  type FieldId,
} from "@/lib/music/analysis-theory";
import { DegreeText, FUNCTION_COLOR } from "./analysis-marks";

/** A chord as the field compares it: root and family. */
function signature(symbol: string): string | null {
  const shape = chordShape(symbol);
  return shape ? `${shape.root}:${shape.family}` : null;
}

/**
 * The harmonic fields of a key, the way harmony books tabulate them: the
 * key's own chords (in a minor key, natural, harmonic and melodic), its
 * secondary dominants, their related IIs, the substitute dominants, the
 * chords of modal borrowing and the diminished passing chords — each
 * spelled in the key, with its function and scale. The chords this song
 * uses are ticked; with `onPick`, a row writes its degree on the chord
 * being analysed.
 */
export function HarmonicField({
  defaultKey,
  songChords,
  onPick,
  current,
  className,
}: {
  defaultKey: string | null;
  /** The song's chords, to tick the ones it uses. */
  songChords: readonly string[];
  /** Writes the degree on the selected chord. */
  onPick?: (degree: Degree) => void;
  /** The selected chord, to point at its row. */
  current?: string | null;
  className?: string;
}) {
  const t = useTranslations("analysis.field");
  const tScale = useTranslations("analysis.scales");
  const [chosenKey, setKey] = useState<string | null>(null);
  const key = chosenKey ?? defaultKey ?? "C";
  const minor = isMinorKey(key);
  const fields = fieldsFor(minor);
  const [chosenField, setField] = useState<FieldId | null>(null);
  const field =
    chosenField && fields.includes(chosenField) ? chosenField : fields[0];
  const [size, setSize] = useState<"tetrads" | "triads">("tetrads");

  // Cheap enough to work out on every render (and the compiler memoizes).
  const rows = harmonicField(key, field, size);
  const used = new Set(songChords.map(signature).filter(Boolean));
  const currentSignature = current ? signature(current) : null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <Select value={key} onValueChange={setKey}>
          <SelectTrigger className="h-8 flex-1 text-xs" aria-label={t("key")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {KEY_NAMES.map((name) => (
              <SelectItem key={name} value={name}>
                {t("keyOption", { key: name })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div
          role="radiogroup"
          aria-label={t("set")}
          onKeyDown={onRadioGroupKeyDown}
          className="bg-muted inline-flex shrink-0 rounded-md p-0.5"
        >
          {(["tetrads", "triads"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={size === option}
              tabIndex={size === option ? 0 : -1}
              onClick={() => setSize(option)}
              className={cn(
                "focus-visible:ring-ring/50 h-7 rounded-[5px] px-2 text-[0.7rem] font-semibold outline-none focus-visible:ring-3",
                size === option
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(option)}
            </button>
          ))}
        </div>
      </div>

      <div
        className="flex flex-wrap gap-1"
        role="tablist"
        aria-label={t("fields")}
      >
        {fields.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={field === id}
            onClick={() => setField(id)}
            className={cn(
              "focus-visible:ring-ring/50 rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold transition-colors outline-none focus-visible:ring-3",
              field === id
                ? "border-primary bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {t(`names.${id}`)}
          </button>
        ))}
      </div>
      <p className="text-muted-foreground text-xs">{t(`hints.${field}`)}</p>

      <ul className="divide-y rounded-lg border">
        {rows.map((row) => {
          const degree = parseDegree(row.degree);
          const sig = signature(row.symbol);
          const inSong = !!sig && used.has(sig);
          const isCurrent = !!sig && sig === currentSignature;
          const content = (
            <>
              <span className="flex min-w-[5.5rem] items-baseline text-base">
                <DegreeText degree={degree} />
              </span>
              <span className="min-w-[3.75rem] font-mono text-xs font-bold">
                {row.symbol}
              </span>
              <span className="text-muted-foreground min-w-0 flex-1 truncate text-[0.7rem]">
                {row.scale ? tScale(row.scale) : ""}
              </span>
              {row.fn && (
                <span
                  className="text-[0.65rem] font-bold"
                  style={{ color: FUNCTION_COLOR[row.fn] }}
                >
                  {row.fn}
                </span>
              )}
              <span className="w-4 shrink-0" aria-hidden={!inSong}>
                {inSong && (
                  <Check
                    className="text-primary h-3.5 w-3.5"
                    aria-label={t("inSong")}
                  />
                )}
              </span>
            </>
          );
          return (
            <li key={row.degree}>
              {onPick && degree ? (
                <button
                  type="button"
                  onClick={() => onPick(degree)}
                  title={t("pick", { degree: row.degree })}
                  className={cn(
                    "hover:bg-muted/70 focus-visible:ring-ring/50 flex w-full items-center gap-2 px-2.5 py-1.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-inset",
                    isCurrent && "bg-primary/10",
                  )}
                >
                  {content}
                </button>
              ) : (
                <div
                  className={cn(
                    "flex items-center gap-2 px-2.5 py-1.5",
                    isCurrent && "bg-primary/10",
                  )}
                >
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-muted-foreground flex items-center gap-1.5 text-[0.68rem]">
        <Check className="text-primary h-3 w-3" aria-hidden />
        {t("inSongHint")}
      </p>
    </div>
  );
}
