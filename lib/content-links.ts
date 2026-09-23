/**
 * Reference links on songs and setlists: provider detection and the
 * client-side mirror of the API's allowlist (`validations/link.rs`).
 *
 * The API is the authority (it answers `INVALID_LINK` for anything else);
 * this only lets the form say what is wrong before saving, and pick the
 * right icon while someone types.
 */

import type { LinkInput, LinkProvider } from "@/types/content";

export const MAX_LINKS = 5;
export const MAX_LINK_URL_LENGTH = 500;
export const MAX_LINK_LABEL_LENGTH = 60;

/** Provider domains; a host matches the domain itself or a subdomain. */
const PROVIDER_DOMAINS: ReadonlyArray<readonly [string, LinkProvider]> = [
  ["youtube.com", "youtube"],
  ["youtu.be", "youtube"],
  ["music.youtube.com", "youtube"],
  ["open.spotify.com", "spotify"],
  ["spotify.link", "spotify"],
  ["drive.google.com", "google_drive"],
  ["docs.google.com", "google_drive"],
  ["music.apple.com", "apple_music"],
  ["deezer.com", "deezer"],
  ["deezer.page.link", "deezer"],
  ["soundcloud.com", "soundcloud"],
  ["on.soundcloud.com", "soundcloud"],
  ["dropbox.com", "dropbox"],
  ["onedrive.live.com", "onedrive"],
  ["1drv.ms", "onedrive"],
];

/** Display names (brands, never translated). */
export const PROVIDER_NAMES: Record<LinkProvider, string> = {
  youtube: "YouTube",
  spotify: "Spotify",
  google_drive: "Google Drive",
  apple_music: "Apple Music",
  deezer: "Deezer",
  soundcloud: "SoundCloud",
  dropbox: "Dropbox",
  onedrive: "OneDrive",
};

// Zero-width, bidi override and BOM characters: used to disguise URLs.
const INVISIBLE = /[​-‏‪-‮⁦-⁩﻿]/;
const CONTROL_OR_SPACE = /[\u0000- \u007F-\u009F\s]/;
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/** The provider of a (lowercase, dot-trimmed) host, if accepted. */
export function providerForHost(host: string): LinkProvider | null {
  let best: readonly [string, LinkProvider] | null = null;
  for (const entry of PROVIDER_DOMAINS) {
    const [domain] = entry;
    const matches =
      host === domain ||
      (host.endsWith(`.${domain}`) && host.length > domain.length + 1);
    if (matches && (!best || domain.length > best[0].length)) best = entry;
  }
  return best ? best[1] : null;
}

export type LinkIssue = "empty" | "too_long" | "not_https" | "not_allowed";

export type LinkCheck =
  | { ok: true; provider: LinkProvider; url: string }
  | { ok: false; issue: LinkIssue };

/**
 * Checks one URL the way the API does: `https`, at most 500 characters,
 * no spaces, control or invisible characters, no credentials or port, a
 * host name (not an IP) that is a provider domain or a subdomain of one.
 */
export function checkLinkUrl(raw: string): LinkCheck {
  const value = raw.trim();
  if (!value) return { ok: false, issue: "empty" };
  if ([...value].length > MAX_LINK_URL_LENGTH) {
    return { ok: false, issue: "too_long" };
  }
  if (CONTROL_OR_SPACE.test(value) || INVISIBLE.test(value)) {
    return { ok: false, issue: "not_allowed" };
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return {
      ok: false,
      issue: /^[a-z]+:/i.test(value) ? "not_allowed" : "not_https",
    };
  }
  if (url.protocol !== "https:") return { ok: false, issue: "not_https" };
  if (url.username || url.password || url.port) {
    return { ok: false, issue: "not_allowed" };
  }

  const host = url.hostname.replace(/\.+$/, "").toLowerCase();
  if (!host || host.startsWith("[") || IPV4.test(host)) {
    return { ok: false, issue: "not_allowed" };
  }
  const provider = providerForHost(host);
  if (!provider) return { ok: false, issue: "not_allowed" };
  if (url.href.length > MAX_LINK_URL_LENGTH) {
    return { ok: false, issue: "too_long" };
  }
  return { ok: true, provider, url: value };
}

/** The provider of a URL as typed, or `null` while it isn't valid. */
export function detectProvider(raw: string): LinkProvider | null {
  const result = checkLinkUrl(raw);
  return result.ok ? result.provider : null;
}

/** One row of the links editor. */
export interface LinkDraft {
  /** Stable key for React (not sent). */
  key: string;
  url: string;
  label: string;
}

export type LinkDraftIssue = LinkIssue | "duplicate" | "label_too_long";

/**
 * Validates the editor rows and turns them into the API payload.
 * Rows with an empty URL and label are ignored. Returns the issues by row
 * key when anything is wrong.
 */
export function draftsToLinks(
  drafts: LinkDraft[],
):
  | { ok: true; links: LinkInput[] }
  | { ok: false; issues: Record<string, LinkDraftIssue> } {
  const issues: Record<string, LinkDraftIssue> = {};
  const links: LinkInput[] = [];
  const seen = new Set<string>();

  for (const draft of drafts) {
    const url = draft.url.trim();
    const label = draft.label.trim();
    if (!url && !label) continue;

    const check = checkLinkUrl(url);
    if (!check.ok) {
      issues[draft.key] = check.issue;
      continue;
    }
    if ([...label].length > MAX_LINK_LABEL_LENGTH) {
      issues[draft.key] = "label_too_long";
      continue;
    }
    if (seen.has(url)) {
      issues[draft.key] = "duplicate";
      continue;
    }
    seen.add(url);
    links.push({ url, label: label || null });
  }

  if (Object.keys(issues).length > 0) return { ok: false, issues };
  return { ok: true, links: links.slice(0, MAX_LINKS) };
}

let draftCounter = 0;

/** A new editor row (optionally prefilled from a stored link). */
export function newLinkDraft(from?: {
  url: string;
  label?: string | null;
}): LinkDraft {
  draftCounter += 1;
  return {
    key: `link-${draftCounter}`,
    url: from?.url ?? "",
    label: from?.label ?? "",
  };
}

/** Whether two link lists are the same (order and content). */
export function sameLinks(
  a: ReadonlyArray<{ url: string; label?: string | null }>,
  b: ReadonlyArray<{ url: string; label?: string | null }>,
): boolean {
  return (
    a.length === b.length &&
    a.every(
      (link, i) =>
        link.url === b[i].url && (link.label ?? null) === (b[i].label ?? null),
    )
  );
}
