"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/hooks/use-online-status";

// A handful of automatic retries with backoff before leaving it to the
// person — a genuinely dead backend shouldn't refresh forever in the
// background, but most of what this covers (a rate limit, a timeout) is
// exactly the kind of thing that clears up within a few seconds.
const AUTO_RETRY_DELAYS_MS = [2000, 4000, 8000];

/**
 * Shown instead of a list's normal "no results" empty state when it came
 * back empty because the server-side fetch failed (a transient rate
 * limit, a timeout — see lib/api-retry.ts), not because there genuinely
 * is no data. The plain empty state would be actively misleading here
 * ("you have no setlists") for data that really does exist and just
 * didn't load this time — which is exactly why reloading the page always
 * "fixed" it: a fresh request usually just succeeds. This does that
 * reload automatically (a few times, backing off) via router.refresh(),
 * and always offers a manual retry too, so it can never get stuck.
 *
 * Offline is a hard stop for that retry loop, not just another failure to
 * back off from: router.refresh() is a soft ("client-side") transition
 * that fetches fresh data straight from the Next.js server, and only full
 * page navigations go through the service worker's offline fallback (see
 * public/sw.js) — a soft transition with no connection either hangs
 * waiting on a fetch that can never complete, or throws and gets caught by
 * the nearest error boundary. So while offline, retries pause entirely
 * (no spinner promising progress that isn't happening) and resume — with a
 * fresh run of the schedule — the instant the browser reports being back
 * online. This state is also marked with `data-load-error-notice` so the
 * service worker never caches it as if it were real content (see
 * ERROR_BOUNDARY_MARKER in sw.js for the same idea applied to error.tsx).
 */
export function LoadErrorNotice() {
  const t = useTranslations("common");
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const [retriesLeft, setRetriesLeft] = useState(AUTO_RETRY_DELAYS_MS.length);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasOnlineRef = useRef(isOnline);

  useEffect(() => {
    if (!isOnline || retriesLeft <= 0) return;

    const delay =
      AUTO_RETRY_DELAYS_MS[AUTO_RETRY_DELAYS_MS.length - retriesLeft];
    timerRef.current = setTimeout(() => {
      setRetriesLeft((n) => n - 1);
      router.refresh();
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only retriesLeft/isOnline should re-arm the timer; router is stable enough for this.
  }, [retriesLeft, isOnline]);

  useEffect(() => {
    // Coming back online after having been offline: give it a fresh run of
    // retries (the old schedule may already have been exhausted while
    // there was no connection to retry over) and kick one off right away.
    if (isOnline && !wasOnlineRef.current) {
      setRetriesLeft(AUTO_RETRY_DELAYS_MS.length);
      router.refresh();
    }
    wasOnlineRef.current = isOnline;
  }, [isOnline, router]);

  return (
    <div
      data-load-error-notice="true"
      className="flex flex-col items-center justify-center gap-2 py-4 text-center"
    >
      {isOnline ? (
        <>
          <RefreshCw className="text-muted-foreground h-5 w-5 animate-spin" />
          <p className="text-muted-foreground text-sm">
            {t("loadErrorRetrying")}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.refresh()}
          >
            {t("tryAgain")}
          </Button>
        </>
      ) : (
        <>
          <WifiOff className="text-muted-foreground h-5 w-5" />
          <p className="text-muted-foreground text-sm">
            {t("loadErrorOffline")}
          </p>
        </>
      )}
    </div>
  );
}
