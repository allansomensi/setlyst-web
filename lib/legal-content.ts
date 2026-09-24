/**
 * The legal texts shown at /legal/[doc]. Kept in code (not in the message
 * catalogs) so each document is reviewed as one block per language: see
 * lib/legal-texts/*.ts, one file per document.
 *
 * Portuguese (pt-BR) is the authoritative version; English and Spanish
 * carry the same content. These texts describe how Setlyst actually works
 * under Brazilian law (LGPD, Marco Civil da Internet, CDC, Decreto
 * 7.962/2013, Lei 9.610/1998). They must be reviewed by a lawyer before
 * being relied upon. Each document has its own version history
 * (lib/legal-texts/versions.ts); `LEGAL_VERSION` (lib/legal.ts, shared
 * with the API's terms version) follows the Terms of Use and the Privacy
 * Policy, the two documents every account accepts.
 */

import type { LegalDocument } from "@/lib/links";
import { COOKIES } from "@/lib/legal-texts/cookies";
import { COPYRIGHT } from "@/lib/legal-texts/copyright";
import { GUIDELINES } from "@/lib/legal-texts/guidelines";
import { PRIVACY } from "@/lib/legal-texts/privacy";
import { SECURITY } from "@/lib/legal-texts/security";
import { SUBSCRIPTION } from "@/lib/legal-texts/subscription";
import { TERMS } from "@/lib/legal-texts/terms";
import type { LegalTexts, LegalText } from "@/lib/legal-texts/types";
import { LEGAL_VERSIONS, type LegalVersion } from "@/lib/legal-texts/versions";

export type {
  LegalBlock,
  LegalSection,
  LegalText,
} from "@/lib/legal-texts/types";
export type { LegalVersion } from "@/lib/legal-texts/versions";
export { LEGAL_VERSIONS } from "@/lib/legal-texts/versions";

/**
 * Version (ISO date) each document has been in force since: the newest
 * entry of its history.
 */
export const LEGAL_UPDATED = Object.fromEntries(
  Object.entries(LEGAL_VERSIONS).map(([doc, versions]) => [
    doc,
    versions[0].version,
  ]),
) as Record<LegalDocument, string>;

/** The version history of `doc`, newest first. */
export function getLegalVersions(doc: LegalDocument): LegalVersion[] {
  return LEGAL_VERSIONS[doc];
}

/**
 * A superseded version of `doc` in `locale` (falling back to English),
 * with the date it stopped being in force; null when `version` is unknown
 * or is the version in force (read that one with `getLegalText`).
 */
export async function getArchivedLegalText(
  doc: LegalDocument,
  version: string,
  locale: string,
): Promise<{ text: LegalText; until: string } | null> {
  const versions = LEGAL_VERSIONS[doc];
  const index = versions.findIndex((entry) => entry.version === version);
  if (index < 1) return null;
  const load = versions[index].archived;
  if (!load) return null;
  const texts = await load();
  return {
    text: (texts as Record<string, LegalText>)[locale] ?? texts.en,
    until: versions[index - 1].version,
  };
}

const TEXTS: Record<LegalDocument, LegalTexts> = {
  terms: TERMS,
  privacy: PRIVACY,
  cookies: COOKIES,
  subscription: SUBSCRIPTION,
  guidelines: GUIDELINES,
  copyright: COPYRIGHT,
  security: SECURITY,
};

/** The document in `locale`, falling back to English. */
export function getLegalText(doc: LegalDocument, locale: string): LegalText {
  const texts = TEXTS[doc];
  return (texts as Record<string, LegalText>)[locale] ?? texts.en;
}
