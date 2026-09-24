import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api-server";

/**
 * Whether an API failure means "this record isn't there for you": deleted,
 * someone else's (403), or a malformed id the API rejected (400).
 */
export function isMissingRecordError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 404 || error.status === 403 || error.status === 400)
  );
}

/**
 * `.catch()` handler for a detail page's loaders: a missing record renders
 * the translated 404 instead of the generic error screen; anything else
 * (an outage, a 500) still reaches the error boundary, which offers a retry.
 */
export function notFoundOnMissing(error: unknown): never {
  if (isMissingRecordError(error)) notFound();
  throw error;
}

/**
 * Whether a public share link (/s, /g) failed because the link itself is
 * gone: turned off, replaced, malformed or never existed. Anything else (an
 * outage, a 500) is not the link's fault and must not read as "revoked".
 */
export function isGoneShareLinkError(error: unknown): boolean {
  return (
    error instanceof ApiError && [400, 403, 404, 410].includes(error.status)
  );
}
