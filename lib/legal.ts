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
 * Communication channel for data subjects and the ANPD (LGPD art. 41).
 * Setlyst is run as a small-scale processing agent (Resolução CD/ANPD nº
 * 2/2022, art. 11) and has not appointed an encarregado: this mailbox is
 * the channel, under the controller's responsibility. Falls back to the
 * general support address while no dedicated mailbox exists; set
 * `NEXT_PUBLIC_PRIVACY_EMAIL` (e.g. privacidade@setlyst.com.br) in
 * production.
 */
export const PRIVACY_EMAIL =
  process.env.NEXT_PUBLIC_PRIVACY_EMAIL || SUPPORT_EMAIL;

/**
 * Dedicated, permanently available channel for copyright notices,
 * counter-notices and reports about public links (Copyright Policy §5).
 * Falls back to the support address; set `NEXT_PUBLIC_COPYRIGHT_EMAIL`
 * (e.g. direitosautorais@setlyst.com.br) in production.
 */
export const COPYRIGHT_EMAIL =
  process.env.NEXT_PUBLIC_COPYRIGHT_EMAIL || SUPPORT_EMAIL;

/**
 * Identification of the data controller and service provider (LGPD art.
 * 41 and Decreto 7.962/2013 art. 2º: name, CPF or CNPJ, physical and
 * electronic address).
 *
 * Setlyst can be run by an individual (pessoa física, CPF) or a company
 * (pessoa jurídica, CNPJ): the kind is read from the tax id itself (11
 * digits = CPF, 14 characters = CNPJ, numeric or alphanumeric), and the
 * legal texts word the identification accordingly.
 * `NEXT_PUBLIC_CONTROLLER_*` are the current variable names; the older
 * `NEXT_PUBLIC_COMPANY_*` ones are still read as a fallback. Bracketed
 * placeholders are shown until the values are configured, and a
 * production build refuses to run with them (see the guard below). These
 * are `NEXT_PUBLIC_` variables: changing them needs a new build.
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

/** The tax id without punctuation, uppercased (alphanumeric CNPJ). */
function normalizeTaxId(value: string): string {
  return value.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

/** Whether `value` is a CPF with valid check digits. */
export function isValidCpf(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) return false;
  const check = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i += 1) {
      sum += Number(digits[i]) * (length + 1 - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return check(9) === Number(digits[9]) && check(10) === Number(digits[10]);
}

/**
 * Whether `value` is a CNPJ with valid check digits. Accepts the
 * alphanumeric format introduced by IN RFB nº 2.229/2024 (12 characters
 * 0-9/A-Z, then two numeric check digits; each character is worth its
 * ASCII code minus 48).
 */
export function isValidCnpj(value: string): boolean {
  const chars = normalizeTaxId(value);
  if (!/^[0-9A-Z]{12}\d{2}$/.test(chars) || /^(\d)\1{13}$/.test(chars)) {
    return false;
  }
  const worth = (char: string) => char.charCodeAt(0) - 48;
  const check = (length: 12 | 13) => {
    let sum = 0;
    let weight = length - 7;
    for (let i = 0; i < length; i += 1) {
      sum += worth(chars[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return check(12) === Number(chars[12]) && check(13) === Number(chars[13]);
}

/** CPF or CNPJ with valid check digits, per its length. */
export function isValidTaxId(value: string): boolean {
  const chars = normalizeTaxId(value);
  if (chars.length === 11) return isValidCpf(chars);
  if (chars.length === 14) return isValidCnpj(chars);
  return false;
}

/** Formats a CPF or CNPJ; anything else is returned as given. */
export function formatTaxId(value: string): string {
  const chars = normalizeTaxId(value);
  if (/^\d{11}$/.test(chars)) {
    return chars.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (/^[0-9A-Z]{12}\d{2}$/.test(chars)) {
    return chars.replace(
      /(\w{2})(\w{3})(\w{3})(\w{4})(\d{2})/,
      "$1.$2.$3/$4-$5",
    );
  }
  return value.trim();
}

interface ControllerEnv {
  name?: string;
  taxId?: string;
  address?: string;
}

export function resolveController(env: ControllerEnv): Controller {
  const rawTaxId = env.taxId?.trim() ?? "";
  const kind: ControllerKind =
    normalizeTaxId(rawTaxId).length === 14 ? "company" : "individual";
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

/**
 * What is missing or wrong in the controller identification (empty when
 * it can be published): a placeholder name or address, or a tax id that
 * is not a CPF/CNPJ with valid check digits.
 */
export function controllerProblems(env: ControllerEnv): string[] {
  const problems: string[] = [];
  const name = env.name?.trim() ?? "";
  const address = env.address?.trim() ?? "";
  const taxId = env.taxId?.trim() ?? "";
  if (!name || name.startsWith("[")) {
    problems.push("NEXT_PUBLIC_CONTROLLER_NAME is not set");
  }
  if (!taxId || taxId.startsWith("[")) {
    problems.push("NEXT_PUBLIC_CONTROLLER_TAX_ID is not set");
  } else if (!isValidTaxId(taxId)) {
    problems.push(
      "NEXT_PUBLIC_CONTROLLER_TAX_ID is not a CPF or CNPJ with valid check digits",
    );
  }
  if (!address || address.startsWith("[")) {
    problems.push("NEXT_PUBLIC_CONTROLLER_ADDRESS is not set");
  }
  return problems;
}

const CONTROLLER_ENV: ControllerEnv = {
  name:
    process.env.NEXT_PUBLIC_CONTROLLER_NAME ||
    process.env.NEXT_PUBLIC_COMPANY_NAME,
  taxId:
    process.env.NEXT_PUBLIC_CONTROLLER_TAX_ID ||
    process.env.NEXT_PUBLIC_COMPANY_CNPJ,
  address:
    process.env.NEXT_PUBLIC_CONTROLLER_ADDRESS ||
    process.env.NEXT_PUBLIC_COMPANY_ADDRESS,
};

export const CONTROLLER: Controller = resolveController(CONTROLLER_ENV);

/**
 * Build guard (Decreto 7.962/2013 art. 2º, LGPD art. 41): a production
 * build must never publish the Terms, the Privacy Policy, the Subscription
 * Terms, the footer or the contact page with placeholders instead of the
 * provider's name, CPF/CNPJ and address. `next build` sets `NEXT_PHASE`;
 * a CI build that is never deployed can opt out with
 * `ALLOW_PLACEHOLDER_CONTROLLER=true`.
 */
if (
  process.env.NEXT_PHASE === "phase-production-build" &&
  process.env.ALLOW_PLACEHOLDER_CONTROLLER !== "true"
) {
  const problems = controllerProblems(CONTROLLER_ENV);
  if (problems.length > 0) {
    throw new Error(
      `Provider identification incomplete (${problems.join("; ")}). ` +
        "Set NEXT_PUBLIC_CONTROLLER_NAME, NEXT_PUBLIC_CONTROLLER_TAX_ID and " +
        "NEXT_PUBLIC_CONTROLLER_ADDRESS (see .env.example) before building " +
        "for production.",
    );
  }
}

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
