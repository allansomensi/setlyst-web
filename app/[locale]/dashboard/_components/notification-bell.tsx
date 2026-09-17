"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Check, ShieldAlert, UserMinus, Users } from "lucide-react";
import { useTranslations, useFormatter } from "next-intl";
import { useSession } from "next-auth/react";
import { Link } from "@/i18n/routing";
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
  BandMemberRemovedData,
  BandRoleChangedData,
  Notification,
  PaginatedResponse,
  PlatformRoleChangedData,
  UnreadCountResponse,
} from "@/types/api";

/** How often the unread badge is refreshed while the popover is closed. */
const POLL_INTERVAL_MS = 30_000;

const TYPE_ICON: Record<Notification["type"], typeof Bell> = {
  band_role_changed: ShieldAlert,
  band_member_removed: UserMinus,
  platform_role_changed: Users,
};

export function NotificationBell({ isCollapsed }: { isCollapsed?: boolean }) {
  const t = useTranslations("notifications");
  const tBandRoles = useTranslations("bands.roles");
  const tPlatformRoles = useTranslations("users.roles");
  const format = useFormatter();
  const { fetchApi } = useApi();
  const { status: sessionStatus } = useSession();
  const isAuthReady = sessionStatus === "authenticated";

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[] | null>(
    null,
  );
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isAuthReady) return;

    let cancelled = false;

    const poll = () => {
      fetchApi<UnreadCountResponse>("/notifications/unread-count")
        .then((res) => {
          if (!cancelled) setUnreadCount(res.unread_count);
        })
        .catch(() => {
          // Best-effort: the badge just skips this refresh cycle.
        });
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [fetchApi, isAuthReady]);

  useEffect(() => {
    if (!open || !isAuthReady) return;

    let cancelled = false;

    fetchApi<PaginatedResponse<Notification>>("/notifications?per_page=15")
      .then((res) => {
        if (!cancelled) setNotifications(res.data);
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

      try {
        await fetchApi(`/notifications/${id}/read`, {
          method: "PATCH",
        });
      } catch {
        // Best-effort: a notification that fails to sync as read simply
        // gets retried the next time the user opens the popover.
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

    try {
      await fetchApi("/notifications/read-all", { method: "PATCH" });
    } catch {
      // Best-effort — see markAsRead.
    }
  }, [fetchApi]);

  const renderMessage = (notification: Notification): string => {
    switch (notification.type) {
      case "band_role_changed": {
        const data = notification.data as BandRoleChangedData;
        return t("bandRoleChanged", {
          band: data.band_name,
          role: tBandRoles(data.new_role),
        });
      }
      case "band_member_removed": {
        const data = notification.data as BandMemberRemovedData;
        return t("bandMemberRemoved", { band: data.band_name });
      }
      case "platform_role_changed": {
        const data = notification.data as PlatformRoleChangedData;
        return t("platformRoleChanged", {
          role: tPlatformRoles(data.new_role),
        });
      }
      default:
        return "";
    }
  };

  const notificationHref = (notification: Notification): string | null => {
    switch (notification.type) {
      case "band_role_changed": {
        const data = notification.data as BandRoleChangedData;
        return `/dashboard/bands/${data.band_id}`;
      }
      case "band_member_removed":
        return "/dashboard/bands";
      default:
        return null;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          title={t("title")}
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
            const Icon = TYPE_ICON[notification.type] ?? Bell;
            const href = notificationHref(notification);
            const isUnread = !notification.read_at;

            const content = (
              <div
                className={cn(
                  "flex gap-3 px-3 py-2.5 transition-colors",
                  isUnread ? "bg-primary/5" : "hover:bg-muted/50",
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    isUnread
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p
                    className={cn(
                      "text-sm leading-snug",
                      isUnread && "font-medium",
                    )}
                  >
                    {renderMessage(notification)}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {format.relativeTime(new Date(notification.created_at))}
                  </p>
                </div>
                {isUnread && (
                  <span className="bg-primary mt-1.5 h-2 w-2 shrink-0 rounded-full" />
                )}
              </div>
            );

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
      </PopoverContent>
    </Popover>
  );
}
