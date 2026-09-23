/**
 * Song performance fields added in v0.12 (energy, time signature, capo,
 * tuning, performance notes), with the limits the API enforces
 * (`models/song.rs`).
 */

export const ENERGY_LEVELS = [1, 2, 3, 4, 5] as const;
export type EnergyLevel = (typeof ENERGY_LEVELS)[number];

/** Message keys under `songs.energy.levels`. */
export const ENERGY_KEYS: Record<EnergyLevel, string> = {
  1: "veryLow",
  2: "low",
  3: "medium",
  4: "high",
  5: "veryHigh",
};

/**
 * Colour of each energy level, cool to warm. Tailwind classes so both
 * themes get a readable variant; the text is always rendered next to the
 * colour, never instead of it.
 */
export const ENERGY_COLORS: Record<
  EnergyLevel,
  { bar: string; soft: string; text: string }
> = {
  1: {
    bar: "bg-sky-500",
    soft: "bg-sky-500/15 border-sky-500/50",
    text: "text-sky-700 dark:text-sky-300",
  },
  2: {
    bar: "bg-teal-500",
    soft: "bg-teal-500/15 border-teal-500/50",
    text: "text-teal-700 dark:text-teal-300",
  },
  3: {
    bar: "bg-amber-500",
    soft: "bg-amber-500/15 border-amber-500/50",
    text: "text-amber-700 dark:text-amber-300",
  },
  4: {
    bar: "bg-orange-500",
    soft: "bg-orange-500/15 border-orange-500/50",
    text: "text-orange-700 dark:text-orange-300",
  },
  5: {
    bar: "bg-rose-500",
    soft: "bg-rose-500/15 border-rose-500/50",
    text: "text-rose-700 dark:text-rose-300",
  },
};

/** CSS colours for charts (same scale as `ENERGY_COLORS`). */
export const ENERGY_CHART_COLORS: Record<EnergyLevel, string> = {
  1: "#0ea5e9",
  2: "#14b8a6",
  3: "#f59e0b",
  4: "#f97316",
  5: "#f43f5e",
};

export function isEnergyLevel(value: unknown): value is EnergyLevel {
  return (
    typeof value === "number" &&
    (ENERGY_LEVELS as readonly number[]).includes(value)
  );
}

/** Accepted time signatures (same list as the API). */
export const TIME_SIGNATURES = [
  "2/4",
  "3/4",
  "4/4",
  "5/4",
  "6/8",
  "7/8",
  "9/8",
  "12/8",
] as const;
export type TimeSignature = (typeof TIME_SIGNATURES)[number];

export const MIN_CAPO = 0;
export const MAX_CAPO = 11;
export const MAX_TUNING_LENGTH = 40;
export const MAX_PERFORMANCE_NOTES_LENGTH = 2000;

/**
 * Tuning suggestions offered in the song form, as message keys under
 * `songs.tuning.suggestions`. Tuning stays free text: these only save
 * typing for the common cases.
 */
export const TUNING_SUGGESTIONS = [
  "standard",
  "halfStepDown",
  "wholeStepDown",
  "dropD",
  "dropC",
  "openG",
  "openD",
  "dadgad",
] as const;
