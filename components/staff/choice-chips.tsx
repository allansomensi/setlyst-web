"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChoiceOption {
  value: string;
  label: string;
  hint?: string;
}

/**
 * A multi-select as a row of toggle chips (`aria-pressed`), for short
 * lists such as roles, plans or languages. An empty selection is shown
 * with `emptyLabel` (usually "everyone").
 */
export function ChoiceChips({
  options,
  value,
  onChange,
  disabled,
  label,
  emptyLabel,
}: {
  options: ChoiceOption[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  /** Accessible name of the group. */
  label: string;
  emptyLabel?: string;
}) {
  const toggle = (option: string) =>
    onChange(
      value.includes(option)
        ? value.filter((v) => v !== option)
        : [...value, option],
    );

  return (
    <div className="space-y-1.5">
      <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const selected = value.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              title={option.hint}
              onClick={() => toggle(option.value)}
              className={cn(
                "focus-visible:ring-ring/50 inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50",
                selected
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              {selected && <Check className="size-3.5" aria-hidden />}
              {option.label}
            </button>
          );
        })}
      </div>
      {emptyLabel && value.length === 0 && (
        <p className="text-muted-foreground text-xs">{emptyLabel}</p>
      )}
    </div>
  );
}
