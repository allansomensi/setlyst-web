"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  INSTRUMENT_MAX,
  INSTRUMENTS_MAX,
  normalizeInstruments,
} from "@/lib/profile";

interface InstrumentsInputProps {
  id: string;
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  "aria-describedby"?: string;
}

/**
 * Instruments as chips: type and press Enter (or a comma) to add, click a
 * chip's × to remove, Backspace on the empty field removes the last one.
 * At most 8, each up to 30 characters, no duplicates.
 */
export function InstrumentsInput({
  id,
  value,
  onChange,
  disabled,
  ...aria
}: InstrumentsInputProps) {
  const t = useTranslations("profile.instruments");
  const [draft, setDraft] = useState("");
  const full = value.length >= INSTRUMENTS_MAX;

  const add = (raw: string) => {
    const parts = raw
      .split(",")
      .map((part) => part.trim().slice(0, INSTRUMENT_MAX))
      .filter(Boolean);
    if (parts.length === 0) return;
    onChange(
      normalizeInstruments([...value, ...parts]).slice(0, INSTRUMENTS_MAX),
    );
    setDraft("");
  };

  return (
    <div
      className={cn(
        "border-input focus-within:border-ring focus-within:ring-ring/50 dark:bg-input/30 flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-lg border bg-transparent px-2 py-1.5 transition-colors focus-within:ring-3",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      {value.map((instrument) => (
        <span
          key={instrument}
          className="bg-secondary text-secondary-foreground inline-flex items-center gap-1 rounded-full py-0.5 pr-1 pl-2.5 text-xs font-medium"
        >
          {instrument}
          <button
            type="button"
            onClick={() =>
              onChange(value.filter((item) => item !== instrument))
            }
            className="hover:bg-foreground/10 focus-visible:ring-ring/50 rounded-full p-0.5 outline-none focus-visible:ring-2"
            aria-label={t("remove", { instrument })}
            disabled={disabled}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        disabled={disabled || full}
        maxLength={INSTRUMENT_MAX}
        placeholder={
          full ? t("full") : value.length ? t("more") : t("placeholder")
        }
        onChange={(event) => {
          const next = event.target.value;
          if (next.includes(",")) add(next);
          else setDraft(next);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            add(draft);
          } else if (event.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => draft.trim() && add(draft)}
        className="placeholder:text-muted-foreground min-w-[8rem] flex-1 bg-transparent px-1 py-0.5 text-base outline-none md:text-sm"
        {...aria}
      />
    </div>
  );
}
