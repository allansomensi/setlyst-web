"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Check, Megaphone, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Link } from "@/components/nav-link";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useApi } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type {
  Notification,
  PaginatedResponse,
  UnreadCountResponse,
} from "@/types/api";
import { NotificationItem } from "@/components/notifications/notification-item";
import {
  ANNOUNCEMENTS_HREF,
  describeNotification,
  SETTINGS_COMMUNICATIONS_HREF,
} from "@/lib/notification-messages";

/** How often the unread badge is refreshed while the popover is closed. */
const POLL_INTERVAL_MS = 60_000;

export function NotificationBell({ isCollapsed }: { isCollapsed?: boolean }) {
  const t = useTranslations("notifications");
  const { fetchApi } = useApi();
  const { status: sessionStatus } = useSession();
  const isAuthReady = sessionStatus === "authenticated";

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[] | null>(
    null,
  );
  const [unreadCount, setUnreadCount] = useState(0);

  // The bell is mounted twice, in the sidebar and in the mobile header,
  // and CSS hides one of them. Only the one on screen polls.
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Read by the polling interval, so the timer is never re-armed just
  // because the function identity changed.
  const fetchApiRef = useRef(fetchApi);
  useEffect(() => {
    fetchApiRef.current = fetchApi;
  }, [fetchApi]);

  // Marking as read is optimistic. A poll that was already on its way
  // when the person pressed "mark all as read" would come back with the
  // old count and put the badge back. Every local change bumps this
  // generation (before and after the request), and a response is only
  // applied when no change happened while it was in flight.
  const generationRef = useRef(0);

  useEffect(() => {
    if (!isAuthReady) return;

    let cancelled = false;

    const poll = () => {
      // Don't poll a tab nobody is looking at, or one with no connection.
      // This runs every minute for as long as the app is open — on a phone
      // left on a music stand between sets, that is a lot of pointless
      // radio wake-ups and a lot of requests the backend rate-limits.
      if (
        document.visibilityState !== "visible" ||
        navigator.onLine === false ||
        triggerRef.current?.getClientRects().length === 0
      ) {
        return;
      }

      const generation = generationRef.current;
      fetchApiRef
        .current<UnreadCountResponse>("/notifications/unread-count")
        .then((res) => {
          if (!cancelled && generation === generationRef.current) {
            setUnreadCount(res.unread_count);
          }
        })
        .catch(() => {
          // Best-effort: the badge just skips this refresh cycle.
        });
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);

    // Catch up as soon as the tab is looked at again, rather than leaving
    // a stale badge until the next tick comes round.
    document.addEventListener("visibilitychange", poll);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [isAuthReady]);

  useEffect(() => {
    if (!open || !isAuthReady) return;

    let cancelled = false;
    const generation = generationRef.current;

    fetchApi<PaginatedResponse<Notification>>("/notifications?per_page=15")
      .then((res) => {
        if (!cancelled && generation === generationRef.current) {
          setNotifications(res.data);
        }
      })
      .catch(() => {
        if (!cancelled) setNotifications([]);
      });

    return () => {
      cancelled = true;
    };
  }, [open, fetchApi, isAuthReady]);

  const markAsRead = useCallback(
    async (id: string) => {
      const wasUnread =
        notifications?.find((n) => n.id === id)?.read_at == null;
      setNotifications(
        (prev) =>
          prev?.map((n) =>
            n.id === id && !n.read_at
              ? { ...n, read_at: new Date().toISOString() }
              : n,
          ) ?? prev,
      );
      if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));

      generationRef.current++;
      try {
        await fetchApi(`/notifications/${id}/read`, {
          method: "PATCH",
        });
      } catch {
        // Best-effort: a notification that fails to sync as read simply
        // gets retried the next time the user opens the popover.
      } finally {
        generationRef.current++;
      }
    },
    [fetchApi, notifications],
  );

  const markAllAsRead = useCallback(async () => {
    setNotifications(
      (prev) =>
        prev?.map((n) => ({
          ...n,
          read_at: n.read_at ?? new Date().toISOString(),
        })) ?? prev,
    );
    setUnreadCount(0);

    generationRef.current++;
    try {
      await fetchApi("/notifications/read-all", { method: "PATCH" });
    } catch {
      // Best-effort, see markAsRead.
    } finally {
      generationRef.current++;
    }
  }, [fetchApi]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          title={t("title")}
          aria-label={
            unreadCount > 0
              ? `${t("title")} (${t("unreadCount", { count: unreadCount })})`
              : t("title")
          }
          className={cn(
            "text-muted-foreground hover:bg-muted hover:text-foreground relative flex h-9 w-9 items-center justify-center rounded-md transition-colors",
          )}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="bg-destructive absolute top-1 right-1 flex h-2 w-2 items-center justify-center rounded-full">
              <span className="sr-only">
                {t("unreadCount", { count: unreadCount })}
              </span>
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align={isCollapsed ? "start" : "end"}
        side="top"
        className="w-80 p-0"
      >
        <div className="flex items-center justify-between px-3 py-2.5">
          <p className="text-sm font-semibold">{t("title")}</p>
          {notifications && notifications.some((n) => !n.read_at) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={markAllAsRead}
            >
              <Check className="h-3 w-3" />
              {t("markAllRead")}
            </Button>
          )}
        </div>

        <Separator />

        <div className="max-h-96 overflow-y-auto">
          {notifications === null && (
            <p className="text-muted-foreground px-3 py-6 text-center text-sm">
              {t("loading")}
            </p>
          )}

          {notifications && notifications.length === 0 && (
            <p className="text-muted-foreground px-3 py-6 text-center text-sm">
              {t("empty")}
            </p>
          )}

          {notifications?.map((notification) => {
            const href = describeNotification(notification).href;
            const isUnread = !notification.read_at;
            const content = <NotificationItem notification={notification} />;

            return (
              <div
                key={notification.id}
                onClick={() => isUnread && markAsRead(notification.id)}
                className="cursor-pointer"
              >
                {href ? (
                  <Link href={href} onClick={() => setOpen(false)}>
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </div>
            );
          })}
        </div>

        <Separator />
        <div className="flex items-center justify-between gap-1 p-1.5">
          <Link
            href={ANNOUNCEMENTS_HREF}
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors"
          >
            <Megaphone className="h-3.5 w-3.5" aria-hidden />
            {t("footer.announcements")}
          </Link>
          <Link
            href={SETTINGS_COMMUNICATIONS_HREF}
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
            {t("footer.preferences")}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
