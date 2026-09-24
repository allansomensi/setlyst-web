import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { LegalDocumentView } from "@/components/legal/legal-document";
import {
  LEGAL_UPDATED,
  getArchivedLegalText,
  getLegalText,
} from "@/lib/legal-content";
import { isLegalDocument } from "@/lib/legal";

type Params = Promise<{ locale: string; doc: string; version: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { doc, locale, version } = await params;
  if (!isLegalDocument(doc)) return {};
  const t = await getTranslations({ locale, namespace: "legal" });
  return {
    title: t("archivedTitle", {
      title: getLegalText(doc, locale).title,
      version,
    }),
    // Superseded texts stay readable (Decreto 7.962/2013 art. 4º, IV) but
    // must not compete with the version in force in search results.
    robots: { index: false, follow: true },
  };
}

/**
 * A superseded version of a legal document, kept readable so everyone can
 * consult the text they accepted. The version in force redirects to the
 * document's own page.
 */
export default async function LegalVersionPage({
  params,
}: {
  params: Promise<{ locale: string; doc: string; version: string }>;
}) {
  const { doc, locale, version } = await params;
  if (!isLegalDocument(doc)) notFound();

  if (version === LEGAL_UPDATED[doc]) {
    redirect({ href: `/legal/${doc}`, locale });
  }

  const archived = await getArchivedLegalText(doc, version, locale);
  if (!archived) notFound();

  return (
    <LegalDocumentView
      doc={doc}
      locale={locale}
      text={archived.text}
      version={version}
      archived={{ until: archived.until }}
    />
  );
}
