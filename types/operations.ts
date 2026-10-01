/**
 * Platform operations: maintenance mode and sign-up switches, the support
 * desk, staff notes, status incidents, the e-mail console, the console
 * overview and search, bulk actions and sign-in activity. Timestamps are
 * naive UTC strings (see lib/dates.ts).
 */

import type { UserRole } from "@/types/api";

// ------------------------------------------------------------- platform

export const MAINTENANCE_MODES = ["off", "read_only", "full"] as const;
export type MaintenanceMode = (typeof MAINTENANCE_MODES)[number];

export interface MaintenanceSettings {
  mode: MaintenanceMode;
  message: string | null;
  ends_at: string | null;
  started_at: string | null;
}

export interface PlatformSettings {
  maintenance: MaintenanceSettings;
  registrations_open: boolean;
  blocked_email_domains: string[];
}

/** `GET /public/platform`. */
export interface PublicPlatformStatus {
  maintenance: MaintenanceSettings;
  registrations_open: boolean;
}

// -------------------------------------------------------------- support

export const TICKET_STATUSES = [
  "open",
  "pending",
  "resolved",
  "closed",
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_CATEGORIES = [
  "account",
  "billing",
  "bug",
  "feature",
  "content",
  "other",
] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

/** Inbox tabs: the statuses plus `active` (open and pending) and `all`. */
export const TICKET_TABS = [
  "active",
  "open",
  "pending",
  "resolved",
  "closed",
  "all",
] as const;
export type TicketTab = (typeof TICKET_TABS)[number];

export const SUPPORT_SUBJECT_MIN = 3;
export const SUPPORT_SUBJECT_MAX = 150;
export const SUPPORT_MESSAGE_MAX = 5_000;

export interface SupportTicket {
  id: string;
  number: number;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  rating: number | null;
  rating_comment: string | null;
  message_count: number;
  last_message_at: string;
  requester_unread: boolean;
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  author_id: string | null;
  author_username: string | null;
  from_staff: boolean;
  internal: boolean;
  body: string;
  created_at: string;
}

export interface SupportTicketDetail {
  ticket: SupportTicket;
  messages: SupportMessage[];
}

export interface MySupportSummary {
  unread: number;
  active: number;
}

export interface AdminSupportTicket {
  id: string;
  number: number;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  user_id: string;
  username: string;
  user_email: string | null;
  user_role: UserRole;
  user_avatar_url: string | null;
  assignee_id: string | null;
  assignee_username: string | null;
  context: Record<string, unknown>;
  rating: number | null;
  rating_comment: string | null;
  message_count: number;
  last_message_at: string;
  first_response_at: string | null;
  last_from_requester: boolean;
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminSupportTicketDetail {
  ticket: AdminSupportTicket;
  messages: SupportMessage[];
  other_tickets: SupportTicket[];
}

export interface SupportSummary {
  open: number;
  pending: number;
  resolved: number;
  closed: number;
  unassigned: number;
  urgent: number;
  mine: number;
  average_rating: number | null;
  ratings: number;
  median_first_response_minutes: number | null;
}

export interface UpdateTicketPayload {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  /** `null` unassigns. */
  assignee_id?: string | null;
}

// ---------------------------------------------------------- staff notes

export const STAFF_NOTE_MAX = 2_000;

export interface UserStaffNote {
  id: string;
  user_id: string;
  author_id: string | null;
  author_username: string | null;
  body: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

// ------------------------------------------------------------ incidents

export const INCIDENT_KINDS = ["incident", "maintenance"] as const;
export type IncidentKind = (typeof INCIDENT_KINDS)[number];

export const INCIDENT_IMPACTS = ["none", "minor", "major", "critical"] as const;
export type IncidentImpact = (typeof INCIDENT_IMPACTS)[number];

export const INCIDENT_STATUSES = [
  "scheduled",
  "investigating",
  "identified",
  "monitoring",
  "resolved",
] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const INCIDENT_COMPONENTS = [
  "web",
  "api",
  "sync",
  "email",
  "payments",
  "exports",
] as const;
export type IncidentComponent = (typeof INCIDENT_COMPONENTS)[number];

export interface IncidentUpdate {
  id: string;
  incident_id: string;
  status: IncidentStatus;
  body: string;
  created_at: string;
}

export interface Incident {
  id: string;
  kind: IncidentKind;
  title: string;
  impact: IncidentImpact;
  status: IncidentStatus;
  components: IncidentComponent[];
  scheduled_for: string | null;
  scheduled_until: string | null;
  started_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  /** Newest first. */
  updates: IncidentUpdate[];
}

export interface PublicIncidents {
  active: Incident[];
  recent: Incident[];
}

// ------------------------------------------------------------- e-mails

export const OUTBOX_STATUSES = [
  "pending",
  "sending",
  "sent",
  "failed",
  "skipped",
] as const;
export type OutboxStatus = (typeof OUTBOX_STATUSES)[number];

export interface OutboxEmail {
  id: string;
  user_id: string | null;
  username: string | null;
  to_email: string;
  template: string;
  locale: string;
  status: OutboxStatus;
  priority: number;
  attempts: number;
  last_error: string | null;
  retryable: boolean;
  scheduled_at: string;
  sent_at: string | null;
  created_at: string;
}

export type OutboxCounts = Record<OutboxStatus, number>;

export interface OutboxSummary {
  smtp_configured: boolean;
  from: string;
  hourly_cap: number;
  sent_last_hour: number;
  oldest_pending_at: string | null;
  last_24h: OutboxCounts;
  last_7d: OutboxCounts;
  templates: { template: string; sent: number; failed: number }[];
}

// -------------------------------------------------------------- console

export interface UserCounts {
  total: number;
  new_today: number;
  new_7d: number;
  new_30d: number;
  active_7d: number;
  active_30d: number;
  unverified: number;
  banned: number;
  deactivated: number;
  staff_without_2fa: number;
}

export interface ConsoleOverview {
  maintenance_mode: MaintenanceMode;
  registrations_open: boolean;
  users: UserCounts;
  signups: { day: string; count: number }[];
  support_open: number;
  support_unassigned: number;
  support_urgent: number;
  moderation_open: number;
  emails_failed_24h: number;
  emails_pending: number;
  oldest_pending_email_at: string | null;
  incidents_active: number;
  generated_at: string;
}

export interface ConsoleSearchResults {
  users: {
    id: string;
    username: string;
    email: string | null;
    avatar_url: string | null;
    role: UserRole;
  }[];
  bands: { id: string; name: string; logo_url: string | null }[];
  songs: {
    id: string;
    title: string;
    subtitle: string | null;
    owner_username: string | null;
  }[];
  setlists: {
    id: string;
    title: string;
    subtitle: string | null;
    owner_username: string | null;
  }[];
  tickets: {
    id: string;
    number: number;
    subject: string;
    status: TicketStatus;
    priority: TicketPriority;
    username: string;
  }[];
}

export const BULK_USER_ACTIONS = [
  "revoke_sessions",
  "ban",
  "unban",
  "deactivate",
  "activate",
] as const;
export type BulkUserAction = (typeof BULK_USER_ACTIONS)[number];

export interface BulkUserResult {
  succeeded: string[];
  failed: { user_id: string; code: string }[];
}

// ----------------------------------------------------- sign-in activity

export interface SignInEvent {
  outcome: "succeeded" | "failed" | "locked";
  method: string | null;
  second_factor: boolean;
  ip_address: string | null;
  created_at: string;
}
