/**
 * The band repertoire is a setlist the API creates with every band and
 * stores as "Repertoire". Its name is always shown translated.
 */

interface MaybeRepertoire {
  title: string;
  is_repertoire?: boolean;
}

/**
 * The name to display for a setlist: the translated repertoire name, or
 * the setlist's own title. `repertoireLabel` comes from
 * `setlists.repertoire.name`.
 */
export function setlistDisplayTitle(
  setlist: MaybeRepertoire,
  repertoireLabel: string,
): string {
  return setlist.is_repertoire ? repertoireLabel : setlist.title;
}

/** Repertoire first, then the rest in their original order. */
export function repertoireFirst<T extends { is_repertoire?: boolean }>(
  setlists: T[],
): T[] {
  return [
    ...setlists.filter((s) => s.is_repertoire),
    ...setlists.filter((s) => !s.is_repertoire),
  ];
}
