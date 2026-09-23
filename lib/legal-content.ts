/**
 * The legal texts shown at /legal/[doc]. Kept in code (not in the message
 * catalogs) so each document is reviewed as one block per language: see
 * lib/legal-texts/*.ts, one file per document.
 *
 * Portuguese (pt-BR) is the authoritative version; English and Spanish
 * carry the same content. These texts describe how Setlyst actually works
 * under Brazilian law (LGPD, Marco Civil da Internet, CDC, Decreto
 * 7.962/2013, Lei 9.610/1998). They must be reviewed by a lawyer before
 * being relied upon, and `LEGAL_VERSION` (lib/legal.ts, shared with the
 * API's terms version) must be bumped whenever they change in substance.
 */

import { LEGAL_VERSION } from "@/lib/legal";
import type { LegalDocument } from "@/lib/links";
import { COOKIES } from "@/lib/legal-texts/cookies";
import { COPYRIGHT } from "@/lib/legal-texts/copyright";
import { GUIDELINES } from "@/lib/legal-texts/guidelines";
import { PRIVACY } from "@/lib/legal-texts/privacy";
import { SECURITY } from "@/lib/legal-texts/security";
import { SUBSCRIPTION } from "@/lib/legal-texts/subscription";
import { TERMS } from "@/lib/legal-texts/terms";
import type { LegalTexts, LegalText } from "@/lib/legal-texts/types";

export type {
  LegalBlock,
  LegalSection,
  LegalText,
} from "@/lib/legal-texts/types";

/** ISO date each document has been in force since. */
export const LEGAL_UPDATED: Record<LegalDocument, string> = {
  terms: LEGAL_VERSION,
  privacy: LEGAL_VERSION,
  cookies: LEGAL_VERSION,
  subscription: LEGAL_VERSION,
  guidelines: LEGAL_VERSION,
  copyright: LEGAL_VERSION,
  security: LEGAL_VERSION,
};

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
