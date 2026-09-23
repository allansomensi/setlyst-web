/**
 * Text matching for the app's search boxes.
 *
 * Musicians type fast and on phones: "cancao" must find "Canção",
 * "jose" must find "José". Both sides are folded the same way before
 * comparing: Unicode NFD splits "ç" into "c" + a combining cedilla, the
 * combining marks are dropped, and case is ignored.
 */
export function foldForSearch(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase();
}

/**
 * The rows whose `keys` (string fields) contain `term`, ignoring case and
 * accents. A blank term keeps every row.
 */
export function filterBySearch<T>(
  rows: readonly T[],
  keys: readonly (keyof T)[],
  term: string,
): T[] {
  const needle = foldForSearch(term.trim());
  if (!needle) return [...rows];
  return rows.filter((row) =>
    keys.some((key) => {
      const value = row[key];
      return typeof value === "string" && foldForSearch(value).includes(needle);
    }),
  );
}
