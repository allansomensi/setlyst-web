/**
 * A `.catch()` shorthand that reports failure through its *return value*
 * instead of writing to a variable in the caller's scope. Mutating a
 * closure-captured `let` from inside an async callback trips the
 * `react-hooks/immutability` lint rule ("cannot reassign after render
 * completes") even in a Server Component, so every page that needs to
 * distinguish "fetch failed" from "fetch returned nothing" goes through
 * this helper and compares the result to `FETCH_FAILED` instead.
 */
export const FETCH_FAILED = Symbol("fetch-failed");

export async function fetchOrFailed<T>(
  promise: Promise<T>,
): Promise<T | typeof FETCH_FAILED> {
  try {
    return await promise;
  } catch {
    return FETCH_FAILED;
  }
}
