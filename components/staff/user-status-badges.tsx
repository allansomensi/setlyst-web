"use client";

import { Ban, KeyRound, PowerOff } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { formatApiDate } from "@/lib/dates";
import type { User } from "@/types/api";

type StatusFields = Pick<
  User,
  "status" | "is_banned" | "banned_until" | "must_change_password"
>;

/**
 * Account state at a glance: suspended (with the end date), deactivated,
 * waiting for a password change — or simply active.
 */
export function UserStatusBadges({ user }: { user: StatusFields }) {
  const t = useTranslations("staff.status");
  const locale = useLocale();

  const badges = [];

  if (user.is_banned) {
    badges.push(
      <Badge key="banned" variant="destructive" title={t("bannedHint")}>
        <Ban />
        {user.banned_until
          ? t("bannedUntil", { date: formatApiDate(user.banned_until, locale) })
          : t("bannedPermanent")}
      </Badge>,
    );
  }

  if (user.status === "inactive") {
    badges.push(
      <Badge key="inactive" variant="secondary">
        <PowerOff />
        {t("inactive")}
      </Badge>,
    );
  }

  if (user.must_change_password) {
    badges.push(
      <Badge
        key="must-change"
        variant="outline"
        className="border-amber-500/40 text-amber-700 dark:text-amber-300"
        title={t("mustChangeHint")}
      >
        <KeyRound />
        {t("mustChange")}
      </Badge>,
    );
  }

  if (badges.length === 0) {
    badges.push(
      <Badge
        key="active"
        variant="outline"
        className="border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
      >
        {t("active")}
      </Badge>,
    );
  }

  return <div className="flex flex-wrap gap-1">{badges}</div>;
}
