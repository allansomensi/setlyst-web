/**
 * Announcements and release-note editing: the shapes of `/announcements*`
 * (users) and `/admin/announcements*`, `/admin/release-notes*` (staff).
 * Timestamps are naive UTC strings (see lib/dates.ts).
 */

import type { UserRole } from "@/types/api";
import type { LocalizedText, ReleaseItemKind } from "@/types/public";

export const ANNOUNCEMENT_LEVELS = [
  "info",
  "success",
  "warning",
  "critical",
] as const;
export type AnnouncementLevel = (typeof ANNOUNCEMENT_LEVELS)[number];

export const ANNOUNCEMENT_STATUSES = [
  "draft",
  "scheduled",
  "active",
  "ended",
  "archived",
] as const;
export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number];

export interface Announcement {
  id: string;
  title: string;
  /** Plain text; line breaks are meaningful, never rendered as HTML. */
  body: string;
  level: AnnouncementLevel;
  show_modal: boolean;
  show_banner: boolean;
  send_notification: boolean;
  send_email: boolean;
  dismissible: boolean;
  requires_acknowledgement: boolean;
  cta_label: string | null;
  cta_url: string | null;
  /** `null` = everybody, for each dimension. */
  audience_roles: UserRole[] | null;
  audience_plans: string[] | null;
  audience_locales: string[] | null;
  starts_at: string | null;
  ends_at: string | null;
  published_at: string | null;
  archived_at: string | null;
  delivered_at: string | null;
  created_by_username: string | null;
  updated_by_username: string | null;
  created_at: string;
  updated_at: string;
  status: AnnouncementStatus | null;
}

export interface AnnouncementStats {
  /** Accounts matching the audience right now. */
  targeted: number;
  seen: number;
  dismissed: number;
  acknowledged: number;
}

export interface AdminAnnouncement extends Announcement {
  stats: AnnouncementStats;
}

export interface AnnouncementReceipt {
  seen_at: string | null;
  dismissed_at: string | null;
  acknowledged_at: string | null;
}

export interface UserAnnouncement extends Announcement {
  receipt: AnnouncementReceipt;
}

export interface ActiveAnnouncements {
  /** To show as modals, oldest first. */
  modal: UserAnnouncement[];
  banner: UserAnnouncement[];
}

export interface AudiencePayload {
  audience_roles: string[] | null;
  audience_plans: string[] | null;
  audience_locales: string[] | null;
}

/** Body of `POST /admin/announcements` (and, partially, `PATCH`). */
export interface AnnouncementPayload extends AudiencePayload {
  title: string;
  body: string;
  level: AnnouncementLevel;
  show_modal: boolean;
  show_banner: boolean;
  send_notification: boolean;
  send_email: boolean;
  dismissible: boolean;
  requires_acknowledgement: boolean;
  cta_label: string | null;
  cta_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
}

export type AnnouncementPatch = Partial<AnnouncementPayload>;

/** One line of a release note, as edited. */
export interface ReleaseNoteItemPayload {
  kind: ReleaseItemKind;
  text: LocalizedText;
}

/** Body of `POST /admin/release-notes` and `PATCH /admin/release-notes/{id}`. */
export interface ReleaseNotePayload {
  version: string;
  title: LocalizedText;
  items: ReleaseNoteItemPayload[];
  /** `YYYY-MM-DD`. */
  released_on: string;
}
