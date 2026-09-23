"use client";

import { useCallback } from "react";
import { secureSignOut } from "@/lib/client-logout";
import { assertSafeEndpoint, InvalidEndpointError } from "@/lib/api-endpoint";
import {
  MAX_RETRIES,
  isIdempotentMethod,
  retryDelayMs,
  statusRetryDelayMs,
  sleep,
} from "@/lib/api-retry";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    /** The API's stable error code — see lib/api-errors.ts. */
    public code: string | null = null,
    public meta: Record<string, unknown> | null = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Same-origin route that adds the API token server-side. */
const CLIENT_API_BASE = "/api/client";

function localePrefix(): string {
  if (typeof window === "undefined") return "";
  const segment = window.location.pathname.split("/")[1];
  return segment ? `/${segment}` : "";
}

/**
 * API calls from client components.
 *
 * Requests go to this app's own `/api/client/*` route handler, which
 * authenticates with the session cookie and attaches the API token on the
 * server: the token is never exposed to page scripts (audit M6). Only the
 * endpoints allowlisted in `app/api/client/[...path]/route.ts` work.
 */
export function useApi() {
  const fetchApi = useCallback(
    async <T>(
      endpoint: string,
      options: RequestInit & {
        /**
         * Set by background/offline-sync callers (see lib/offline/sync.ts).
         * A stale or momentarily-invalid token during a *silent* background
         * sync must never force-navigate the person away from whatever
         * they're doing — most critically, out of Live Mode mid-show —
         * just because one background request hit a 401. The call still
         * fails normally (callers see it as a failed sync item); only the
         * global sign-out/redirect is skipped. A real foreground request
         * (any page load, any user action) still signs the person out
         * immediately, so an actually-expired session is never silently
         * ignored — it's just not *this* code path's job to announce it.
         */
        suppressAuthRedirect?: boolean;
      } = {},
    ): Promise<T> => {
      // Same guarantee the server-side caller enforces: an endpoint can
      // neither point at another host nor be re-targeted with `..`
      // segments. See lib/api-endpoint.ts.
      try {
        assertSafeEndpoint(endpoint);
      } catch (error) {
        if (error instanceof InvalidEndpointError) {
          throw new ApiError(400, "Invalid endpoint");
        }
        throw error;
      }

      const { suppressAuthRedirect, ...requestInit } = options;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(requestInit.headers as Record<string, string>),
      };

      // See lib/api-retry.ts: offline sync alone can mean dozens of these
      // calls in a short window (one per setlist/band), and without a
      // retry a single transient 429/5xx used to throw and abort the
      // whole sync, or blow up whatever page triggered it.
      const canRetryMethod = isIdempotentMethod(options.method);

      let attempt = 0;
      for (;;) {
        let res: Response;
        try {
          res = await fetch(`${CLIENT_API_BASE}${endpoint}`, {
            ...requestInit,
            headers,
            credentials: "same-origin",
          });
        } catch {
          if (canRetryMethod && attempt < MAX_RETRIES) {
            attempt++;
            await sleep(retryDelayMs(attempt));
            continue;
          }
          throw new ApiError(
            503,
            "Network error. Please check your connection.",
          );
        }

        if (res.status === 401) {
          if (!suppressAuthRedirect) {
            await secureSignOut({
              callbackUrl: `${localePrefix()}/login?reason=session`,
            });
          }
          throw new ApiError(401, "Session expired. Please sign in again.");
        }

        if (!res.ok) {
          const delay = statusRetryDelayMs(
            options.method,
            res.status,
            res.headers.get("retry-after"),
            attempt + 1,
          );
          if (delay !== null) {
            attempt++;
            await sleep(delay);
            continue;
          }

          let message = `API error: ${res.status}`;
          let code: string | null = null;
          let meta: Record<string, unknown> | null = null;
          try {
            const body = await res.json();
            if (typeof body?.message === "string") message = body.message;
            if (typeof body?.code === "string") code = body.code;
            if (body?.meta && typeof body.meta === "object") meta = body.meta;
          } catch {
            // ignore parse errors
          }

          if (res.status === 429) {
            message = "Too many requests. Please wait a moment and try again.";
          }

          throw new ApiError(res.status, message, code, meta);
        }

        if (res.status === 204) return {} as T;

        return res.json();
      }
    },
    [],
  );

  return { fetchApi };
}
