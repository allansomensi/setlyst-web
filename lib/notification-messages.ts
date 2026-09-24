/**
 * Maps a notification (type + data) to what the bell shows: a message key
 * in the `notifications` namespace with its values, a link, an icon and a
 * tone. Pure, so every type and variant is unit tested; the component
 * only translates.
 */

import type {
  AnnouncementNotificationData,
  BandMemberAddedData,
  BandMemberRemovedData,
  BandRoleChangedData,
  BandSuggestionCreatedData,
  BandSuggestionResolvedData,
  CreditsGrantedData,
  ModerationActionData,
  Notification,
  PlatformRoleChangedData,
  ReleasePublishedData,
  SecurityAlertData,
  ShareLinkRevokedData,
  SubscriptionChangedData,
  TrialEndingData,
} from "@/types/api";

export type NotificationIcon =
  | "bell"
  | "roleChanged"
  | "memberRemoved"
  | "memberAdded"
  | "platformRole"
  | "linkRevoked"
  | "announcement"
  | "release"
  | "suggestion"
  | "suggestionAccepted"
  | "suggestionRejected"
  | "moderation"
  | "subscription"
  | "trial"
  | "credits"
  | "security";

export type NotificationTone =
  "default" | "info" | "success" | "warning" | "critical";

/** A value the component must translate before interpolating. */
export type NotificationValueRef =
  | { ref: "bandRole"; value: string }
  | { ref: "platformRole"; value: string }
  | { ref: "plan"; value: string }
  | { ref: "date"; value: string };

export type NotificationValue = string | number | NotificationValueRef;

export interface NotificationView {
  /** Key in the `notifications` namespace. */
  key: string;
  values: Record<string, NotificationValue>;
  /** Optional second line (a moderator's note...), shown verbatim. */
  detail: string | null;
  href: string | null;
  icon: NotificationIcon;
  tone: NotificationTone;
}

/** Where the settings sections live (see the settings page). */
export const SETTINGS_SUBSCRIPTION_HREF = "/dashboard/settings#subscription";
export const SETTINGS_SECURITY_HREF = "/dashboard/settings#security";
export const SETTINGS_COMMUNICATIONS_HREF =
  "/dashboard/settings#communications";
export const ANNOUNCEMENTS_HREF = "/dashboard/announcements";
export const WHATS_NEW_HREF = "/dashboard/whats-new";

const SUBSCRIPTION_KINDS = [
  "plan_granted",
  "extended",
  "trial_started",
  "trial_extended",
  "revoked",
  "expired",
  // Card payments
  "subscribed",
  "plan_changed",
  "payment_failed",
  "cancel_scheduled",
  "resumed",
  "canceled",
] as const;

/** Subscription changes shown as a warning rather than good news. */
const SUBSCRIPTION_WARNINGS: ReadonlySet<string> = new Set([
  "revoked",
  "expired",
  "payment_failed",
  "cancel_scheduled",
  "canceled",
]);

const CREDIT_REASONS = [
  "admin_adjustment",
  "promo_code",
  "referral_referrer",
  "referral_referred",
] as const;

const SECURITY_EVENTS = [
  "password_changed",
  "email_changed",
  "two_factor_enabled",
  "two_factor_disabled",
  "recovery_codes_regenerated",
  "google_linked",
  "google_unlinked",
  "password_reset_by_staff",
  "email_changed_by_staff",
  "login_locked",
  "reauth_sessions_revoked",
] as const;

const MODERATION_ACTIONS = [
  "avatar_removed",
  "band_logo_removed",
  "username_reset",
] as const;

const SUGGESTION_STATUSES = ["accepted", "rejected", "withdrawn"] as const;

function oneOf<T extends string>(list: readonly T[], value: unknown): T | null {
  return typeof value === "string" &&
    (list as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

function bandHref(bandId: unknown): string {
  return typeof bandId === "string" && bandId
    ? `/dashboard/bands/${encodeURIComponent(bandId)}`
    : "/dashboard/bands";
}

function toneOfLevel(level: unknown): NotificationTone {
  return level === "success" || level === "warning" || level === "critical"
    ? level
    : "info";
}

function view(
  key: string,
  values: Record<string, NotificationValue>,
  href: string | null,
  icon: NotificationIcon,
  tone: NotificationTone = "default",
  detail: string | null = null,
): NotificationView {
  return { key, values, detail, href, icon, tone };
}

export function describeNotification(
  notification: Pick<Notification, "type" | "data">,
): NotificationView {
  const data = (notification.data ?? {}) as unknown as Record<string, unknown>;

  switch (notification.type) {
    case "band_role_changed": {
      const d = data as unknown as BandRoleChangedData;
      return view(
        "bandRoleChanged",
        { band: d.band_name, role: { ref: "bandRole", value: d.new_role } },
        bandHref(d.band_id),
        "roleChanged",
      );
    }
    case "band_member_removed": {
      const d = data as unknown as BandMemberRemovedData;
      return view(
        "bandMemberRemoved",
        { band: d.band_name },
        "/dashboard/bands",
        "memberRemoved",
      );
    }
    case "platform_role_changed": {
      const d = data as unknown as PlatformRoleChangedData;
      return view(
        "platformRoleChanged",
        { role: { ref: "platformRole", value: d.new_role } },
        null,
        "platformRole",
      );
    }
    case "band_member_added": {
      const d = data as unknown as BandMemberAddedData;
      return view(
        "bandMemberAdded",
        { band: d.band_name, role: { ref: "bandRole", value: d.role } },
        bandHref(d.band_id),
        "memberAdded",
      );
    }
    case "share_link_revoked": {
      const d = data as unknown as ShareLinkRevokedData;
      const href =
        d.kind === "gig"
          ? `/dashboard/gigs/${encodeURIComponent(d.target_id)}`
          : `/dashboard/setlists/${encodeURIComponent(d.target_id)}`;
      return d.reason
        ? view(
            "shareLinkRevokedWithReason",
            { title: d.title, reason: d.reason },
            href,
            "linkRevoked",
            "warning",
          )
        : view(
            "shareLinkRevoked",
            { title: d.title },
            href,
            "linkRevoked",
            "warning",
          );
    }
    case "announcement": {
      const d = data as unknown as AnnouncementNotificationData;
      const id = typeof d.announcement_id === "string" ? d.announcement_id : "";
      return view(
        "announcement",
        { title: d.title ?? "" },
        id ? `${ANNOUNCEMENTS_HREF}#announcement-${id}` : ANNOUNCEMENTS_HREF,
        "announcement",
        toneOfLevel(d.level),
      );
    }
    case "release_published": {
      const d = data as unknown as ReleasePublishedData;
      return view(
        "releasePublished",
        { version: d.version ?? "" },
        WHATS_NEW_HREF,
        "release",
        "info",
      );
    }
    case "band_suggestion_created": {
      const d = data as unknown as BandSuggestionCreatedData;
      return view(
        "bandSuggestionCreated",
        { user: d.suggested_by, song: d.song_title, band: d.band_name },
        bandHref(d.band_id),
        "suggestion",
      );
    }
    case "band_suggestion_resolved": {
      const d = data as unknown as BandSuggestionResolvedData;
      const status = oneOf(SUGGESTION_STATUSES, d.status);
      return view(
        status
          ? `bandSuggestionResolved.${status}`
          : "bandSuggestionResolved.other",
        { song: d.song_title, band: d.band_name },
        bandHref(d.band_id),
        status === "accepted"
          ? "suggestionAccepted"
          : status === "rejected"
            ? "suggestionRejected"
            : "suggestion",
        status === "accepted" ? "success" : "default",
      );
    }
    case "moderation_action": {
      const d = data as unknown as ModerationActionData;
      const action = oneOf(MODERATION_ACTIONS, d.action);
      const href =
        action === "band_logo_removed"
          ? bandHref(d.band_id)
          : "/dashboard/profile";
      return view(
        action ? `moderationAction.${action}` : "moderationAction.other",
        { band: d.band_name ?? "" },
        href,
        "moderation",
        "warning",
        typeof d.note === "string" && d.note.trim() ? d.note.trim() : null,
      );
    }
    case "subscription_changed": {
      const d = data as unknown as SubscriptionChangedData;
      const kind = oneOf(SUBSCRIPTION_KINDS, d.kind);
      const values: Record<string, NotificationValue> = {
        plan: { ref: "plan", value: d.plan_code ?? "" },
      };
      if (d.current_period_end) {
        values.date = { ref: "date", value: d.current_period_end };
      }
      const withDate =
        d.current_period_end &&
        (kind === "plan_granted" || kind === "extended");
      return view(
        kind
          ? `subscriptionChanged.${kind}${withDate ? "Until" : ""}`
          : "subscriptionChanged.other",
        values,
        SETTINGS_SUBSCRIPTION_HREF,
        "subscription",
        kind && SUBSCRIPTION_WARNINGS.has(kind) ? "warning" : "success",
      );
    }
    case "trial_ending": {
      const d = data as unknown as TrialEndingData;
      return view(
        "trialEnding",
        {
          plan: { ref: "plan", value: d.plan_code ?? "" },
          date: { ref: "date", value: d.ends_at ?? "" },
        },
        SETTINGS_SUBSCRIPTION_HREF,
        "trial",
        "warning",
      );
    }
    case "credits_granted": {
      const d = data as unknown as CreditsGrantedData;
      const amount = Number(d.amount) || 0;
      const reason = oneOf(CREDIT_REASONS, d.reason);
      if (amount < 0) {
        return view(
          "creditsDebited",
          { amount: Math.abs(amount) },
          SETTINGS_SUBSCRIPTION_HREF,
          "credits",
        );
      }
      return view(
        reason ? `creditsGranted.${reason}` : "creditsGranted.other",
        { amount },
        SETTINGS_SUBSCRIPTION_HREF,
        "credits",
        "success",
      );
    }
    case "security_alert": {
      const d = data as unknown as SecurityAlertData;
      const event = oneOf(SECURITY_EVENTS, d.event);
      return view(
        event ? `securityAlert.${event}` : "securityAlert.other",
        {},
        SETTINGS_SECURITY_HREF,
        "security",
        "critical",
      );
    }
    default:
      return view("unknown", {}, null, "bell");
  }
}

/** Title-cased plan code, for plans without a translated name. */
export function formatPlanCode(code: string): string {
  return code
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
