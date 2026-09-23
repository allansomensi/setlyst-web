/**
 * Pure helpers for the moderation queue ("Pontos de atenção"): which
 * actions fit a flag, who may act on it, and the known reason codes.
 */

import { outranks } from "@/lib/staff-permissions";
import type { UserRole } from "@/types/api";
import type {
  ModerationAction,
  ModerationFlag,
  ModerationTarget,
} from "@/types/staff";
import { isUuid } from "@/lib/uuid";

/**
 * Window event fired by the moderation queue after a flag is resolved or
 * a rescan, so the navigation badge refreshes without a page change.
 */
export const MODERATION_CHANGED_EVENT = "setlyst:moderation-changed";

/** Reason codes the API raises (anything else is shown verbatim). */
export const MODERATION_REASONS = [
  "hate_term",
  "sexual_term",
  "offensive_term",
  "blocked_domain",
  "suspicious_url",
  "nsfw_image",
  "violent_image",
  "safe_search",
  "user_report",
  "inappropriate_avatar",
  "offensive_username",
  "impersonation",
  "spam",
  "other",
] as const;
export type ModerationReason = (typeof MODERATION_REASONS)[number];

export function isKnownReason(reason: string): reason is ModerationReason {
  return (MODERATION_REASONS as readonly string[]).includes(reason);
}

/** Flags whose subject is an image (shown blurred until revealed). */
export function isImageTarget(target: ModerationTarget): boolean {
  return target === "avatar" || target === "band_logo";
}

/** Corrective actions that fit a flag (dismissing always fits). */
export function actionsForFlag(
  flag: Pick<ModerationFlag, "target_type" | "band" | "user" | "current_value">,
): Exclude<ModerationAction, "dismiss">[] {
  switch (flag.target_type) {
    case "avatar":
      return flag.current_value ? ["remove_avatar"] : [];
    case "band_logo":
      return flag.band && flag.current_value ? ["remove_band_logo"] : [];
    case "username":
      return ["reset_username"];
    case "profile":
      return flag.user.avatar_url
        ? ["remove_avatar", "reset_username"]
        : ["reset_username"];
  }
}

export function isDestructiveAction(action: ModerationAction): boolean {
  return action !== "dismiss";
}

/**
 * Whether `actor` may resolve a flag about `flag.user`: staff act only on
 * accounts below their rank (moderators → regular users); on their own
 * account they may only dismiss.
 */
export function canActOnFlag(
  actor: { id: string; role: UserRole },
  flag: Pick<ModerationFlag, "user">,
  action: ModerationAction = "dismiss",
): boolean {
  if (flag.user.id === actor.id) return action === "dismiss";
  return outranks(actor.role, flag.user.role);
}

/** Tab values of the queue mapped to the API's `status` filter. */
export const MODERATION_TABS = ["open", "actioned", "dismissed"] as const;
export type ModerationTab = (typeof MODERATION_TABS)[number];

/** The `?user_id=` filter of the queue: a UUID, or `null` (ignored). */
export function parseModerationUserFilter(
  value: string | undefined,
): string | null {
  const trimmed = value?.trim() ?? "";
  return isUuid(trimmed) ? trimmed.toLowerCase() : null;
}

/** The queue filtered to the flags about one account. */
export function moderationQueueHref(userId: string): string {
  return `/dashboard/admin/moderation?${new URLSearchParams({ user_id: userId })}`;
}

export function parseModerationTab(value: string | undefined): ModerationTab {
  return (MODERATION_TABS as readonly string[]).includes(value ?? "")
    ? (value as ModerationTab)
    : "open";
}
