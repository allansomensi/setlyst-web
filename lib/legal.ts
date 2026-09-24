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
export const LEGAL_VERSION = "2026-09-24";

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
 * 41 and Decreto 7.962/2013 art. 2º: name, CPF or CNPJ, physical and
 * electronic address).
 *
 * Setlyst can be run by an individual (pessoa física, CPF) or a company
 * (pessoa jurídica, CNPJ): the kind is read from the tax id itself (11
 * digits = CPF, 14 = CNPJ), and the legal texts word the identification
 * accordingly. `NEXT_PUBLIC_CONTROLLER_*` are the current variable names;
 * the older `NEXT_PUBLIC_COMPANY_*` ones are still read as a fallback.
 * Bracketed placeholders are shown until the values are configured, and
 * these are `NEXT_PUBLIC_` variables: changing them needs a new build.
 */
export type ControllerKind = "individual" | "company";

export interface Controller {
  kind: ControllerKind;
  name: string;
  /** Formatted (000.000.000-00 or 00.000.000/0000-00) when complete. */
  taxId: string;
  /** "CPF" or "CNPJ". */
  taxIdLabel: "CPF" | "CNPJ";
  address: string;
}

/** Formats a CPF or CNPJ; anything else is returned as given. */
export function formatTaxId(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (digits.length === 14) {
    return digits.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5",
    );
  }
  return value.trim();
}

export function resolveController(env: {
  name?: string;
  taxId?: string;
  address?: string;
}): Controller {
  const rawTaxId = env.taxId?.trim() ?? "";
  const kind: ControllerKind =
    rawTaxId.replace(/\D/g, "").length === 14 ? "company" : "individual";
  const taxIdLabel = kind === "company" ? "CNPJ" : "CPF";
  return {
    kind,
    name:
      env.name?.trim() ||
      (kind === "company" ? "[RAZÃO SOCIAL]" : "[NOME COMPLETO]"),
    taxId: rawTaxId ? formatTaxId(rawTaxId) : `[${taxIdLabel}]`,
    taxIdLabel,
    address: env.address?.trim() || "[ENDEREÇO]",
  };
}

export const CONTROLLER: Controller = resolveController({
  name:
    process.env.NEXT_PUBLIC_CONTROLLER_NAME ||
    process.env.NEXT_PUBLIC_COMPANY_NAME,
  taxId:
    process.env.NEXT_PUBLIC_CONTROLLER_TAX_ID ||
    process.env.NEXT_PUBLIC_COMPANY_CNPJ,
  address:
    process.env.NEXT_PUBLIC_CONTROLLER_ADDRESS ||
    process.env.NEXT_PUBLIC_COMPANY_ADDRESS,
});

/**
 * "Fulano, pessoa física inscrita no CPF sob o nº …, com endereço em …"
 * (or the company wording), per language, for the opening of the Terms
 * and the Privacy Policy.
 */
export function controllerIdentity(
  locale: "pt-BR" | "en" | "es",
  controller: Controller = CONTROLLER,
): string {
  const { name, taxId, address } = controller;
  const company = controller.kind === "company";
  switch (locale) {
    case "en":
      return company
        ? `${name}, a company registered under Brazilian CNPJ no. ${taxId}, with its registered office at ${address}`
        : `${name}, an individual registered under Brazilian CPF no. ${taxId}, with address at ${address}`;
    case "es":
      return company
        ? `${name}, persona jurídica inscrita en el CNPJ con el nº ${taxId}, con domicilio social en ${address}`
        : `${name}, persona física inscrita en el CPF con el nº ${taxId}, con domicilio en ${address}`;
    default:
      return company
        ? `${name}, pessoa jurídica inscrita no CNPJ sob o nº ${taxId}, com sede em ${address}`
        : `${name}, pessoa física inscrita no CPF sob o nº ${taxId}, com endereço em ${address}`;
  }
}
