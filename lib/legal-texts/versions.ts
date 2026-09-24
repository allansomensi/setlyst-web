/*
 * Version history of each legal document (Decreto 7.962/2013 art. 4º, IV;
 * CDC art. 46): every document has its own version, newest first, with a
 * one-line summary of what changed, shown in "Histórico de versões" at the
 * end of /legal/<doc>.
 *
 * Publishing a new version of a document:
 *   1. copy the current text (lib/legal-texts/<doc>.ts) to
 *      lib/legal-texts/archive/<doc>-<old version>.ts and set `archived`
 *      on the old entry below to a loader of that snapshot, so it stays
 *      readable at /legal/<doc>/v/<old version>;
 *   2. edit the text and add the new entry at the top of the list;
 *   3. if the document is the Terms of Use or the Privacy Policy and the
 *      change is relevant, bump `LEGAL_VERSION` (lib/legal.ts) together
 *      with the API's `CURRENT_TERMS_VERSION`, so every account is asked
 *      to accept again, and announce it at least 15 days before it takes
 *      effect (Terms §"Alterações destes Termos").
 */

import type { AppLocale } from "@/i18n/locales";
import type { LegalDocument } from "@/lib/links";
import type { LegalTexts } from "./types";

export interface LegalVersion {
  /** ISO date the version took effect; also its identifier. */
  version: string;
  /** One line on what this version changed, per language. */
  summary: Record<AppLocale, string>;
  /**
   * The text of a superseded version. Absent on the version in force,
   * which is read from lib/legal-texts/<doc>.ts.
   */
  archived?: () => Promise<LegalTexts>;
}

export const LEGAL_VERSIONS: Record<LegalDocument, LegalVersion[]> = {
  terms: [
    {
      version: "2026-09-24",
      summary: {
        "pt-BR":
          "Versão de lançamento: regras de idade e assistência do responsável, links públicos sem letras nem cifras, garantia sobre o conteúdo inserido, encerramento com prazo de exportação e reembolso proporcional, cessão, comunicações essenciais e aviso prévio de 15 dias para alterações.",
        en: "Launch version: age and guardian rules, public links without lyrics or chords, warranty over the content you add, termination with an export window and pro-rata refund, assignment, essential communications and 15 days' notice of changes.",
        es: "Versión de lanzamiento: reglas de edad y asistencia del responsable, enlaces públicos sin letras ni acordes, garantía sobre el contenido introducido, terminación con plazo de exportación y reembolso proporcional, cesión, comunicaciones esenciales y aviso previo de 15 días para los cambios.",
      },
    },
  ],
  privacy: [
    {
      version: "2026-09-24",
      summary: {
        "pt-BR":
          "Versão de lançamento: bases legais dos registros de acesso, operadores nomeados (inclusive Resend) e transferência internacional, registros de aceite, acesso da Equipe somente leitura, canal de privacidade de agente de pequeno porte, adolescentes e prazo de 3 dias úteis para comunicar incidentes.",
        en: "Launch version: legal bases for access records, named processors (including Resend) and international transfers, acceptance records, read-only Staff access, small-scale agent privacy channel, teenagers and a 3-business-day incident notice.",
        es: "Versión de lanzamiento: bases legales de los registros de acceso, encargados identificados (incluido Resend) y transferencia internacional, registros de aceptación, acceso del Equipo solo de lectura, canal de privacidad de agente de pequeño porte, adolescentes y plazo de 3 días hábiles para comunicar incidentes.",
      },
    },
  ],
  cookies: [
    {
      version: "2026-09-24",
      summary: {
        "pt-BR":
          "Versão de lançamento: nomes reais e duração de cada cookie, itens do armazenamento local e da sessão, banco de dados offline e estatísticas sem cookies.",
        en: "Launch version: actual name and lifetime of each cookie, local and session storage items, the offline database and cookieless statistics.",
        es: "Versión de lanzamiento: nombres reales y duración de cada cookie, elementos del almacenamiento local y de sesión, base de datos sin conexión y estadísticas sin cookies.",
      },
    },
  ],
  subscription: [
    {
      version: "2026-09-24",
      summary: {
        "pt-BR":
          "Versão de lançamento: contratação durante o teste com aviso 7 dias antes da primeira cobrança, aceite expresso, preços finais, novas tentativas de cobrança por 14 dias, desistência pelo botão em Configurações, reembolso de saldo, contestação de cobranças, idade mínima e alterações com aviso prévio.",
        en: "Launch version: subscribing during the trial with a reminder 7 days before the first charge, express acceptance, final prices, payment retries for 14 days, withdrawal from a button in Settings, balance refunds, disputed charges, minimum age and changes with prior notice.",
        es: "Versión de lanzamiento: contratación durante la prueba con aviso 7 días antes del primer cobro, aceptación expresa, precios finales, reintentos de cobro durante 14 días, desistimiento con un botón en Configuración, reembolso de saldo, impugnación de cobros, edad mínima y cambios con aviso previo.",
      },
    },
  ],
  guidelines: [
    {
      version: "2026-09-24",
      summary: {
        "pt-BR": "Versão de lançamento.",
        en: "Launch version.",
        es: "Versión de lanzamiento.",
      },
    },
  ],
  copyright: [
    {
      version: "2026-09-24",
      summary: {
        "pt-BR":
          "Versão de lançamento: links públicos sem letras nem cifras, canal dedicado de notificação, retirada em até 2 dias úteis independentemente de ordem judicial e limites objetivos de reincidência.",
        en: "Launch version: public links without lyrics or chords, a dedicated notice channel, takedown within 2 business days without a court order and objective repeat-infringer thresholds.",
        es: "Versión de lanzamiento: enlaces públicos sin letras ni acordes, canal específico de notificación, retirada en un plazo de 2 días hábiles sin orden judicial y umbrales objetivos de reincidencia.",
      },
    },
  ],
  security: [
    {
      version: "2026-09-24",
      summary: {
        "pt-BR": "Versão de lançamento.",
        en: "Launch version.",
        es: "Versión de lanzamiento.",
      },
    },
  ],
};
