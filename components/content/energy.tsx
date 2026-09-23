"use client";

import { useTranslations } from "next-intl";
import {
  ENERGY_COLORS,
  ENERGY_KEYS,
  ENERGY_LEVELS,
  isEnergyLevel,
  type EnergyLevel,
} from "@/lib/song-fields";
import { cn } from "@/lib/utils";

/** A five-segment bar with the level's name for screen readers. */
export function EnergyMeter({
  energy,
  className,
  showLabel = false,
}: {
  energy: number | null | undefined;
  className?: string;
  showLabel?: boolean;
}) {
  const t = useTranslations("songs.energy");
  if (!isEnergyLevel(energy)) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  const label = t(`levels.${ENERGY_KEYS[energy]}`);
  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      title={t("meterTitle", { label })}
    >
      <span
        className="flex items-end gap-0.5"
        role="img"
        aria-label={t("meterTitle", { label })}
      >
        {ENERGY_LEVELS.map((level) => (
          <span
            key={level}
            className={cn(
              "w-1.5 rounded-sm",
              level <= energy ? ENERGY_COLORS[energy].bar : "bg-muted",
            )}
            style={{ height: `${6 + level * 2}px` }}
          />
        ))}
      </span>
      {showLabel && (
        <span className={cn("text-xs font-medium", ENERGY_COLORS[energy].text)}>
          {label}
        </span>
      )}
    </span>
  );
}

/**
 * Energy as a segmented control (radio group): 1 to 5, plus "not set".
 * Arrow keys move between the options, like native radios.
 */
export function EnergyPicker({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: EnergyLevel | null;
  onChange: (value: EnergyLevel | null) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("songs.energy");
  const options: Array<EnergyLevel | null> = [null, ...ENERGY_LEVELS];

  return (
    <div
      role="radiogroup"
      aria-labelledby={`${id}-label`}
      className="grid grid-cols-3 gap-1.5 sm:grid-cols-6"
    >
      {options.map((level) => {
        const checked = value === level;
        const label =
          level === null ? t("notSet") : t(`levels.${ENERGY_KEYS[level]}`);
        return (
          <button
            key={level ?? "none"}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(level)}
            onKeyDown={(e) => {
              const index = options.indexOf(value);
              let next = -1;
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                next = (index + 1) % options.length;
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                next = (index - 1 + options.length) % options.length;
              }
              if (next >= 0) {
                e.preventDefault();
                onChange(options[next]);
                const group = e.currentTarget.parentElement;
                requestAnimationFrame(() =>
                  (
                    group?.querySelectorAll('[role="radio"]')[next] as
                      HTMLElement | undefined
                  )?.focus(),
                );
              }
            }}
            className={cn(
              "focus-visible:ring-ring/50 flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg border px-1 py-1.5 text-center text-[11px] leading-tight font-medium transition-colors focus-visible:ring-3 focus-visible:outline-none disabled:opacity-50",
              checked
                ? level === null
                  ? "border-foreground/40 bg-muted"
                  : cn(ENERGY_COLORS[level].soft, ENERGY_COLORS[level].text)
                : "hover:bg-muted/60 text-muted-foreground",
            )}
          >
            {level !== null && (
              <span className="flex items-end gap-px" aria-hidden>
                {ENERGY_LEVELS.map((l) => (
                  <span
                    key={l}
                    className={cn(
                      "w-1 rounded-sm",
                      l <= level
                        ? ENERGY_COLORS[level].bar
                        : "bg-muted-foreground/25",
                    )}
                    style={{ height: `${3 + l * 1.5}px` }}
                  />
                ))}
              </span>
            )}
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
