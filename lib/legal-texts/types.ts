import type { AppLocale } from "@/i18n/locales";

/**
 * A block of a legal section:
 * - a string is a numbered clause (rendered as "3.2");
 * - `list` is a lettered list attached to the clause before it;
 * - `note` is an unnumbered highlighted paragraph.
 */
export type LegalBlock = string | { list: string[] } | { note: string };

export interface LegalSection {
  /** Anchor, identical in every language so links survive a switch. */
  id: string;
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalText {
  title: string;
  summary: string;
  sections: LegalSection[];
}

export type LegalTexts = Record<AppLocale, LegalText>;
