/**
 * Pure helpers for release notes: the staff editor's form model, its
 * validation (mirroring the API, `models/release_note.rs`) and the
 * "What's new" unseen marker.
 */

import type { ReleaseNotePayload } from "@/types/communication";
import type { ReleaseItemKind, ReleaseNote } from "@/types/public";

export const RELEASE_ITEM_KINDS = [
  "new",
  "improved",
  "fixed",
  "security",
] as const satisfies readonly ReleaseItemKind[];

/** Editor tab order: Portuguese first (the team's language). */
export const RELEASE_LOCALES = ["pt-BR", "en", "es"] as const;
export type ReleaseLocale = (typeof RELEASE_LOCALES)[number];
export const REQUIRED_RELEASE_LOCALES: readonly ReleaseLocale[] = [
  "pt-BR",
  "en",
];

export const RELEASE_TITLE_MIN = 3;
export const RELEASE_TITLE_MAX = 120;
export const RELEASE_ITEM_MIN = 3;
export const RELEASE_ITEM_MAX = 600;
export const RELEASE_MAX_ITEMS = 40;

/** `MAJOR.MINOR.PATCH` with an optional `-prerelease` (`1.2.3-beta.1`). */
export const RELEASE_VERSION_PATTERN = /^\d+\.\d+\.\d+(-[a-z0-9.]+)?$/;

export type LocalizedDraft = Record<ReleaseLocale, string>;

export interface ReleaseItemDraft {
  /** Local key for React lists (not sent). */
  key: string;
  kind: ReleaseItemKind;
  text: LocalizedDraft;
}

export interface ReleaseNoteForm {
  version: string;
  /** `YYYY-MM-DD`. */
  released_on: string;
  title: LocalizedDraft;
  items: ReleaseItemDraft[];
}

let keySeed = 0;
/** A key for an item added in the browser (never rendered on the server). */
export function newItemKey(): string {
  keySeed += 1;
  return `new-${keySeed}`;
}

function draftFrom(
  map: Partial<Record<string, string>> | undefined,
): LocalizedDraft {
  return {
    "pt-BR": map?.["pt-BR"] ?? "",
    en: map?.en ?? "",
    es: map?.es ?? "",
  };
}

export function emptyReleaseItem(
  kind: ReleaseItemKind = "new",
): ReleaseItemDraft {
  return { key: newItemKey(), kind, text: draftFrom(undefined) };
}

export function emptyReleaseNoteForm(today: string): ReleaseNoteForm {
  return {
    version: "",
    released_on: today,
    title: draftFrom(undefined),
    // Deterministic key: this form is also rendered on the server.
    items: [{ ...emptyReleaseItem(), key: "item-0" }],
  };
}

function isKind(kind: string): kind is ReleaseItemKind {
  return (RELEASE_ITEM_KINDS as readonly string[]).includes(kind);
}

export function releaseNoteToForm(note: ReleaseNote): ReleaseNoteForm {
  return {
    version: note.version,
    released_on: note.released_on,
    title: draftFrom(note.title),
    items: note.items.map((item, index) => ({
      key: `item-${index}`,
      kind: isKind(item.kind) ? item.kind : "new",
      text: draftFrom(item.text),
    })),
  };
}

/** Trimmed texts; an empty optional locale is left out (it falls back). */
function localizedPayload(
  draft: LocalizedDraft,
): Partial<Record<string, string>> {
  const out: Partial<Record<string, string>> = {};
  for (const locale of RELEASE_LOCALES) {
    const value = draft[locale].trim();
    if (value || REQUIRED_RELEASE_LOCALES.includes(locale)) out[locale] = value;
  }
  return out;
}

export function formToReleasePayload(
  form: ReleaseNoteForm,
): ReleaseNotePayload {
  return {
    version: form.version.trim(),
    released_on: form.released_on,
    title: localizedPayload(form.title),
    items: form.items.map((item) => ({
      kind: item.kind,
      text: localizedPayload(item.text),
    })),
  };
}

export type ReleaseIssueCode =
  | "version"
  | "date"
  | "required"
  | "tooShort"
  | "tooLong"
  | "noItems"
  | "tooManyItems";

export interface ReleaseIssue {
  /** `version`, `released_on`, `title` or `items.{index}` (+ locale). */
  field: string;
  locale?: ReleaseLocale;
  code: ReleaseIssueCode;
}

function checkText(
  field: string,
  draft: LocalizedDraft,
  min: number,
  max: number,
): ReleaseIssue[] {
  const issues: ReleaseIssue[] = [];
  for (const locale of RELEASE_LOCALES) {
    const length = Array.from(draft[locale].trim()).length;
    if (length === 0) {
      if (REQUIRED_RELEASE_LOCALES.includes(locale)) {
        issues.push({ field, locale, code: "required" });
      }
    } else if (length < min) {
      issues.push({ field, locale, code: "tooShort" });
    } else if (length > max) {
      issues.push({ field, locale, code: "tooLong" });
    }
  }
  return issues;
}

export function validateReleaseNoteForm(form: ReleaseNoteForm): ReleaseIssue[] {
  const issues: ReleaseIssue[] = [];
  const version = form.version.trim();
  if (version.length > 20 || !RELEASE_VERSION_PATTERN.test(version)) {
    issues.push({ field: "version", code: "version" });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.released_on)) {
    issues.push({ field: "released_on", code: "date" });
  }
  issues.push(
    ...checkText("title", form.title, RELEASE_TITLE_MIN, RELEASE_TITLE_MAX),
  );
  if (form.items.length === 0) {
    issues.push({ field: "items", code: "noItems" });
  } else if (form.items.length > RELEASE_MAX_ITEMS) {
    issues.push({ field: "items", code: "tooManyItems" });
  }
  form.items.forEach((item, index) => {
    issues.push(
      ...checkText(
        `items.${index}`,
        item.text,
        RELEASE_ITEM_MIN,
        RELEASE_ITEM_MAX,
      ),
    );
  });
  return issues;
}

/** Locales with at least one problem (to mark the tabs). */
export function localesWithIssues(issues: ReleaseIssue[]): Set<ReleaseLocale> {
  return new Set(
    issues.flatMap((issue) => (issue.locale ? [issue.locale] : [])),
  );
}

/** `items` with the entry at `from` moved to `to` (clamped). */
export function moveItem<T>(
  items: readonly T[],
  from: number,
  to: number,
): T[] {
  const next = [...items];
  if (from < 0 || from >= next.length) return next;
  const target = Math.max(0, Math.min(next.length - 1, to));
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved);
  return next;
}

/**
 * The marker stored in `ui_settings.whatsNew.lastSeen`: the id of the
 * newest published release (latest `released_on`, then latest
 * publication), or `null` when there is none.
 */
export function latestReleaseId(
  notes: readonly Pick<ReleaseNote, "id" | "released_on" | "published_at">[],
): string | null {
  let best: (typeof notes)[number] | null = null;
  for (const note of notes) {
    if (!note.published_at) continue;
    if (
      !best ||
      note.released_on > best.released_on ||
      (note.released_on === best.released_on &&
        (note.published_at ?? "") > (best.published_at ?? ""))
    ) {
      best = note;
    }
  }
  return best?.id ?? null;
}

/** Whether there's a release the person hasn't opened yet. */
export function hasUnseenRelease(
  latestId: string | null,
  lastSeen: string | null | undefined,
): boolean {
  return latestId !== null && lastSeen !== latestId;
}
