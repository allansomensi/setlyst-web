"use client";

import { Eye } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/routing";
import { formatApiDateTime } from "@/lib/dates";
import type { AuditLogEntry } from "@/types/api";

/** Actions with a translated label (see messages: staff.audit.actions). */
export const AUDIT_ACTIONS = [
  "user.registered",
  "user.created",
  "user.updated",
  "user.role_changed",
  "user.activated",
  "user.deactivated",
  "user.banned",
  "user.unbanned",
  "user.deleted",
  "user.password_changed",
  "user.password_reset",
  "user.sessions_revoked",
  "user.quotas_updated",
  "user.impersonated",
  "user.login_failed",
  "band.updated",
  "band.deleted",
  "band.member_added",
  "band.member_removed",
  "band.member_role_changed",
  "band.ownership_transferred",
  "song.updated",
  "song.deleted",
  "setlist.updated",
  "setlist.deleted",
  "share.revoked",
  "share.unlocked",
  "settings.quota_defaults_updated",
  "user.self_deleted",
  "user.email_changed",
  "user.two_factor_enabled",
  "user.two_factor_disabled",
  "user.password_recovered",
  "user.login_locked",
  "user.terms_accepted",
  "user.subscription_granted",
  "user.subscription_revoked",
  "user.credits_adjusted",
  "billing.settings_updated",
  "billing.plan_updated",
  "billing.trials_granted",
  "promo.created",
  "promo.updated",
  "promotion.created",
  "promotion.updated",
  "promotion.deleted",
  "announcement.created",
  "announcement.updated",
  "announcement.published",
  "announcement.archived",
  "announcement.deleted",
  "release_note.created",
  "release_note.updated",
  "release_note.published",
  "release_note.unpublished",
  "release_note.deleted",
  "moderation.dismissed",
  "moderation.avatar_removed",
  "moderation.band_logo_removed",
  "moderation.username_reset",
  "moderation.rescan",
] as const;

const DESTRUCTIVE = new Set([
  "user.banned",
  "user.deleted",
  "user.deactivated",
  "band.deleted",
  "song.deleted",
  "setlist.deleted",
  "share.revoked",
  "band.member_removed",
  "user.self_deleted",
  "user.subscription_revoked",
  "promotion.deleted",
  "announcement.deleted",
  "release_note.deleted",
  "moderation.avatar_removed",
  "moderation.band_logo_removed",
  "moderation.username_reset",
]);

export function useAuditActionLabel() {
  const t = useTranslations("staff.audit");
  return (action: string) =>
    (AUDIT_ACTIONS as readonly string[]).includes(action)
      ? t(`actions.${action.replace(".", "_")}`)
      : action;
}

/** Where a target can be opened in the staff console, if anywhere. */
function targetHref(entry: AuditLogEntry): string | null {
  if (!entry.target_id || entry.action.endsWith(".deleted")) return null;
  switch (entry.target_type) {
    case "user":
      return `/dashboard/users/${entry.target_id}`;
    case "band":
      return `/dashboard/admin/bands/${entry.target_id}`;
    case "song":
      return `/dashboard/admin/songs/${entry.target_id}`;
    case "setlist":
      return `/dashboard/admin/setlists/${entry.target_id}`;
    case "announcement":
      return `/dashboard/admin/announcements/${entry.target_id}`;
    case "release_note":
      return `/dashboard/admin/release-notes/${entry.target_id}`;
    default:
      return null;
  }
}

/** Metadata worth showing inline, as short "key: value" pairs. */
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function summarize(
  metadata: Record<string, unknown>,
  locale: string,
): string[] {
  return Object.entries(metadata ?? {})
    .filter(
      ([, value]) => value !== null && value !== undefined && value !== "",
    )
    .slice(0, 6)
    .map(([key, value]) => {
      const text =
        typeof value === "string" && ISO_TIMESTAMP.test(value)
          ? formatApiDateTime(value, locale)
          : typeof value === "object"
            ? JSON.stringify(value)
            : String(value);
      return `${key}: ${text.length > 80 ? `${text.slice(0, 77)}…` : text}`;
    });
}

export function AuditEntry({
  entry,
  showTarget = true,
}: {
  entry: AuditLogEntry;
  showTarget?: boolean;
}) {
  const t = useTranslations("staff.audit");
  const locale = useLocale();
  const label = useAuditActionLabel()(entry.action);
  const details = summarize(entry.metadata, locale);
  const href = targetHref(entry);

  return (
    <div className="space-y-1 py-2.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <Badge
          variant={DESTRUCTIVE.has(entry.action) ? "destructive" : "secondary"}
        >
          {label}
        </Badge>
        {showTarget &&
          entry.target_label &&
          (href ? (
            <Link href={href} className="font-medium hover:underline">
              {entry.target_label}
            </Link>
          ) : (
            <span className="font-medium">{entry.target_label}</span>
          ))}
        <span className="text-muted-foreground">
          {t("by", { actor: entry.actor_username ?? t("system") })}
        </span>
        {entry.impersonator_id && (
          <Badge variant="outline" title={t("impersonatedHint")}>
            <Eye />
            {t("impersonated")}
          </Badge>
        )}
      </div>
      <div className="text-muted-foreground flex flex-wrap gap-x-3 text-xs">
        <time dateTime={entry.created_at}>
          {formatApiDateTime(entry.created_at, locale)}
        </time>
        {entry.ip_address && <span>IP {entry.ip_address}</span>}
        {details.map((line) => (
          <span key={line} className="font-mono">
            {line}
          </span>
        ))}
      </div>
    </div>
  );
}
