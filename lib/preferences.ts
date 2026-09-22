/**
 * Shared shape of the user-preference values, so the settings form and the
 * server action that persists them can't drift apart. Isomorphic — safe to
 * import from both client and server code.
 */

/**
 * The Live Mode font sizes offered in settings, as percentages.
 *
 * This is the whole allowed set, not a set of shortcuts alongside a free
 * numeric field: on stage the useful decision is "bigger" or "smaller",
 * and a handful of well-spaced steps makes that a single tap. Live Mode
 * itself still offers continuous zoom for fine adjustment in the moment.
 */
export const FONT_SIZE_PRESETS = [75, 100, 125, 150, 200] as const;

export const DEFAULT_FONT_SIZE = 100;

/**
 * Coerces any incoming font size to one of the presets.
 *
 * Applied on the server as well as in the form: a preference row written
 * by an older build (or by hand) can hold any value in the old 50–300
 * range, and settings must still render a sane selected state rather than
 * showing nothing as selected. Picks the nearest preset so an existing
 * 130% lands on 125% instead of silently resetting to the default.
 */
export function normalizeFontSize(value: number | undefined | null): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_FONT_SIZE;
  }

  return FONT_SIZE_PRESETS.reduce((closest, preset) =>
    Math.abs(preset - value) < Math.abs(closest - value) ? preset : closest,
  );
}
