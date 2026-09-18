"use client";

import { useSession, signOut } from "next-auth/react";
import { useCallback } from "react";
import {
  MAX_RETRIES,
  RETRYABLE_STATUSES,
  isIdempotentMethod,
  parseRetryAfterMs,
  retryDelayMs,
  sleep,
} from "@/lib/api-retry";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function useApi() {
  const { data: session } = useSession();
  const token = session?.user?.apiToken;

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
      if (!endpoint.startsWith("/") || endpoint.startsWith("//")) {
        throw new ApiError(400, "Invalid endpoint");
      }

      const { suppressAuthRedirect, ...requestInit } = options;

      const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(requestInit.headers as Record<string, string>),
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // See lib/api-retry.ts: offline sync alone can mean dozens of these
      // calls in a short window (one per setlist/band), and without a
      // retry a single transient 429/5xx used to throw and abort the
      // whole sync, or blow up whatever page triggered it.
      const canRetryMethod = isIdempotentMethod(options.method);

      let attempt = 0;
      for (;;) {
        let res: Response;
        try {
          res = await fetch(`${baseUrl}${endpoint}`, {
            ...requestInit,
            headers,
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
            await signOut({ callbackUrl: "/login" });
          }
          throw new ApiError(401, "Session expired. Please sign in again.");
        }

        if (!res.ok) {
          const canRetryStatus =
            res.status === 429 ||
            (canRetryMethod && RETRYABLE_STATUSES.has(res.status));

          if (canRetryStatus && attempt < MAX_RETRIES) {
            attempt++;
            const retryAfterMs = parseRetryAfterMs(
              res.headers.get("retry-after"),
            );
            await sleep(retryDelayMs(attempt, retryAfterMs));
            continue;
          }

          let message = `API error: ${res.status}`;
          try {
            const body = await res.json();
            if (typeof body?.message === "string") message = body.message;
          } catch {
            // ignore parse errors
          }

          if (res.status === 429) {
            message = "Too many requests. Please wait a moment and try again.";
          }

          throw new ApiError(res.status, message);
        }

        if (res.status === 204) return {} as T;

        return res.json();
      }
    },
    [token],
  );

  return { fetchApi };
}
