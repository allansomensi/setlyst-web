/**
 * Runs `Promise.allSettled` and returns only the values that resolved, in
 * the same order, silently dropping whichever rejected.
 *
 * Several pages here combine independent sources — personal setlists plus
 * one call per band, say — and used to await them with `Promise.all`,
 * which means a single one failing (a transient rate limit, a timeout)
 * took the ENTIRE page down to the generic error boundary, even though
 * the other N-1 calls succeeded and there was a perfectly good page to
 * render with what came back. Swap in `settledValues` wherever "missing
 * one source's data" should degrade the page, not crash it.
 */
export async function settledValues<T>(promises: Promise<T>[]): Promise<T[]> {
  const results = await Promise.allSettled(promises);
  const values: T[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") values.push(result.value);
  }
  return values;
}
