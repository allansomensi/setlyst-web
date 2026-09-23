"use client";

import {
  Bell,
  BellRing,
  Coins,
  CreditCard,
  Hourglass,
  Lightbulb,
  Link2Off,
  Megaphone,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  UserMinus,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { parseApiTimestamp } from "@/lib/dates";
import {
  describeNotification,
  formatPlanCode,
  type NotificationIcon,
  type NotificationTone,
  type NotificationValue,
} from "@/lib/notification-messages";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types/api";

const ICONS: Record<NotificationIcon, LucideIcon> = {
  bell: Bell,
  roleChanged: ShieldAlert,
  memberRemoved: UserMinus,
  memberAdded: UserPlus,
  platformRole: Users,
  linkRevoked: Link2Off,
  announcement: Megaphone,
  release: Sparkles,
  suggestion: Lightbulb,
  suggestionAccepted: ThumbsUp,
  suggestionRejected: ThumbsDown,
  moderation: ShieldAlert,
  subscription: CreditCard,
  trial: Hourglass,
  credits: Coins,
  security: ShieldCheck,
};

/** Icon circle colors per tone, unread / read. */
const TONES: Record<NotificationTone, string> = {
  default: "bg-primary/10 text-primary",
  info: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  critical: "bg-red-500/15 text-red-700 dark:text-red-300",
};

/** Resolves the translated message of a notification. */
export function useNotificationMessage() {
  const t = useTranslations("notifications");
  const tBandRoles = useTranslations("bands.roles");
  const tPlatformRoles = useTranslations("roles");
  const format = useFormatter();

  const resolve = (value: NotificationValue): string | number => {
    if (typeof value !== "object") return value;
    switch (value.ref) {
      case "bandRole":
        return tBandRoles.has(value.value)
          ? tBandRoles(value.value)
          : value.value;
      case "platformRole":
        return tPlatformRoles.has(value.value)
          ? tPlatformRoles(value.value)
          : value.value;
      case "plan":
        return t.has(`plans.${value.value}`)
          ? t(`plans.${value.value}`)
          : formatPlanCode(value.value) || t("plans.unknown");
      case "date": {
        const date = parseApiTimestamp(value.value);
        return Number.isNaN(date.getTime())
          ? ""
          : format.dateTime(date, { dateStyle: "medium" });
      }
    }
  };

  return (notification: Pick<Notification, "type" | "data">) => {
    const view = describeNotification(notification);
    const values = Object.fromEntries(
      Object.entries(view.values).map(([k, v]) => [k, resolve(v)]),
    );
    const text = t.has(view.key) ? t(view.key, values) : t("unknown");
    return { ...view, text };
  };
}

interface NotificationItemProps {
  notification: Pick<Notification, "type" | "data" | "created_at" | "read_at">;
  className?: string;
}

/**
 * One notification row: tone-colored icon, translated message, optional
 * detail line (a moderator's note) and relative time. Shared by the bell
 * and the announcement editor's preview.
 */
export function NotificationItem({
  notification,
  className,
}: NotificationItemProps) {
  const format = useFormatter();
  const describe = useNotificationMessage();
  const view = describe(notification);
  const Icon = ICONS[view.icon] ?? BellRing;
  const isUnread = !notification.read_at;

  return (
    <div
      className={cn(
        "flex gap-3 px-3 py-2.5 transition-colors",
        isUnread ? "bg-primary/5" : "hover:bg-muted/50",
        className,
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUnread ? TONES[view.tone] : "bg-muted text-muted-foreground",
        )}
        aria-hidden
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p
          className={cn(
            "text-sm leading-snug break-words",
            isUnread && "font-medium",
          )}
        >
          {view.text}
        </p>
        {view.detail && (
          <p className="text-muted-foreground line-clamp-2 text-xs break-words">
            {view.detail}
          </p>
        )}
        <p className="text-muted-foreground text-xs">
          {/* An explicit "now": without it next-intl warns
              (ENVIRONMENT_FALLBACK) on every render. */}
          {format.relativeTime(
            parseApiTimestamp(notification.created_at),
            new Date(),
          )}
        </p>
      </div>
      {isUnread && (
        <span
          className="bg-primary mt-1.5 h-2 w-2 shrink-0 rounded-full"
          aria-hidden
        />
      )}
    </div>
  );
}
