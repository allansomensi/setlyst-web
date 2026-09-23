/**
 * Constants shared by everything that points at the legal documents: the
 * public pages, the registration consent, the dashboard's "accept the new
 * terms" modal and the e-mail footers.
 *
 * `LEGAL_VERSION` must match the API's `CURRENT_TERMS_VERSION`
 * (`GET /public/legal/version`). Bump both together whenever the Terms of
 * Use or the Privacy Policy change in substance: every account that
 * accepted an older version is then asked to accept again.
 */

import {
  LEGAL_DOCUMENTS,
  SUPPORT_EMAIL,
  type LegalDocument,
} from "@/lib/links";

export { LEGAL_DOCUMENTS, isLegalDocument } from "@/lib/links";
export type { LegalDocument } from "@/lib/links";

/** Version (ISO date) of the legal documents in force. */
export const LEGAL_VERSION = "2026-09-23";

/** Locale-less path of each document, for `Link` from `@/i18n/routing`. */
export const LEGAL_HREFS = Object.fromEntries(
  LEGAL_DOCUMENTS.map((doc) => [doc, `/legal/${doc}`]),
) as Record<LegalDocument, `/legal/${LegalDocument}`>;

/** Path of a document, optionally with a section anchor. */
export function legalHref(doc: LegalDocument, section?: string): string {
  return section ? `${LEGAL_HREFS[doc]}#${section}` : LEGAL_HREFS[doc];
}

/**
 * Contact of the person in charge of personal data (LGPD "encarregado").
 * Falls back to the general support address while no dedicated mailbox
 * exists.
 */
export const PRIVACY_EMAIL =
  process.env.NEXT_PUBLIC_PRIVACY_EMAIL || SUPPORT_EMAIL;

/**
 * Identification of the data controller and service provider (LGPD art.
 * 41 and Decreto 7.962/2013 art. 2º). The bracketed placeholders are shown
 * as-is until the owner configures the real values.
 */
export const CONTROLLER = {
  name: process.env.NEXT_PUBLIC_COMPANY_NAME || "[RAZÃO SOCIAL]",
  taxId: process.env.NEXT_PUBLIC_COMPANY_CNPJ || "[CNPJ]",
  address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || "[ENDEREÇO]",
} as const;
