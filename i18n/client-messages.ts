import type { AbstractIntlMessages } from "next-intl";

/**
 * The translations each part of the app hands to the browser.
 *
 * The message files are about 240 KB each, and passing all of them to
 * NextIntlClientProvider inlined the whole file into every page's HTML:
 * the landing page and the login form carried the staff console's texts.
 * Each area now gets only the namespaces its client components read
 * with `useTranslations`, through its own provider:
 *
 * - `shell`: the `[locale]` layout (public site, sign-in pages, and the
 *   providers and toasts around every page);
 * - `dashboard`: app/[locale]/dashboard/layout.tsx;
 * - `staff`: the staff console (dashboard/admin and dashboard/users);
 * - `live`: Live Mode, app/[locale]/(live)/layout.tsx;
 * - `publicShare`: the public share pages (/s, /g).
 *
 * A dotted entry sends only that part of a namespace. Server components
 * read the full files and are unaffected. lib/__tests__/client-messages
 * walks each area's imports and fails when a namespace is missing here.
 */
export const CLIENT_NAMESPACES = {
  shell: [
    "apiErrors",
    "auth.login",
    "auth.register",
    "changePassword",
    "common",
    "error",
    "forgotPassword",
    "googleAuth",
    "legal.consent",
    "notFound",
    "passwordPolicy",
    "pricing",
    "releaseNotes",
    "site",
    "twoFactor",
    "unsubscribe",
    "usernamePolicy",
  ],
  dashboard: [
    "account.delete",
    "account.emailChange",
    "analytics",
    "announcements",
    "apiErrors",
    "artists",
    "audit",
    "bandCopies",
    "bandNotes",
    "bands",
    "billing",
    "changePassword",
    "chordproImport",
    "common",
    "communication",
    "dashboard.nextGig",
    "dashboard.onboarding",
    "downloads",
    "emailVerification",
    "error",
    "gigs",
    "googleAuth",
    "impersonation",
    "insights",
    "installApp",
    "legal",
    "links",
    "lyrics",
    "metrics",
    "nav",
    "notFound",
    "notifications",
    "offlineSync",
    "pagination",
    "passwordPolicy",
    "pdfOptions",
    "pins",
    "pricing",
    "profile",
    "quotas",
    "releaseNotes",
    "roles",
    "security",
    "setlists",
    "settings",
    "shareLock",
    "songDetail",
    "songExport",
    "songs",
    "staff.nav",
    "suggestions",
    "tags",
    "terms.gate",
    "tours",
    "trash",
    "trial",
    "twoFactor",
    "userProfile.report",
    "usernamePolicy",
  ],
  staff: [
    "announcements",
    "apiErrors",
    "audit",
    "bands.roles",
    "billingAdmin",
    "common",
    "error",
    "finance",
    "impersonation",
    "lyrics",
    "moderation",
    "nav",
    "notFound",
    "notifications",
    "pagination",
    "passwordPolicy",
    "pricing.features",
    "quotas",
    "releaseNotes",
    "releaseNotesAdmin",
    "roles",
    "songExport",
    "staff",
    "tags",
    "usernamePolicy",
  ],
  live: [
    "common",
    "error",
    "liveMode",
    "lyrics",
    "notFound",
    "offlineSync",
    "setlists.repertoire",
    "settings.display.live.fonts",
  ],
  publicShare: [
    "apiErrors",
    "common",
    "downloads",
    "gigs.dialog.status",
    "links",
    "pdfOptions",
    "publicPage",
    "setlists",
    "settings",
  ],
} as const satisfies Record<string, readonly string[]>;

export type ClientMessagesArea = keyof typeof CLIENT_NAMESPACES;

/** The parts of `messages` named by `namespaces` (dotted paths allowed). */
export function pickMessages(
  messages: AbstractIntlMessages,
  namespaces: readonly string[],
): AbstractIntlMessages {
  const picked: AbstractIntlMessages = {};
  for (const namespace of namespaces) {
    const path = namespace.split(".");
    let source: AbstractIntlMessages | string | undefined = messages;
    for (const key of path) {
      source = typeof source === "object" ? source[key] : undefined;
    }
    if (source === undefined) continue;

    let target = picked;
    for (const key of path.slice(0, -1)) {
      const next = target[key];
      if (typeof next !== "object") target[key] = {};
      target = target[key] as AbstractIntlMessages;
    }
    target[path[path.length - 1]] = source;
  }
  return picked;
}

/** `messages` narrowed to what `area` renders on the client. */
export function clientMessages(
  messages: AbstractIntlMessages,
  area: ClientMessagesArea,
): AbstractIntlMessages {
  return pickMessages(messages, CLIENT_NAMESPACES[area]);
}
