import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalDocumentView } from "@/components/legal/legal-document";
import { LEGAL_UPDATED, getLegalText } from "@/lib/legal-content";
import { LEGAL_HREFS, isLegalDocument } from "@/lib/legal";
import { publicPageMetadata } from "@/lib/seo";

type Params = Promise<{ locale: string; doc: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { doc, locale } = await params;
  if (!isLegalDocument(doc)) return {};
  const text = getLegalText(doc, locale);
  return publicPageMetadata({
    locale,
    path: LEGAL_HREFS[doc],
    title: text.title,
    description: text.summary,
  });
}

/** A legal document in the version in force (lib/legal-texts/versions.ts). */
export default async function LegalPage({ params }: { params: Params }) {
  const { doc, locale } = await params;
  if (!isLegalDocument(doc)) notFound();

  return (
    <LegalDocumentView
      doc={doc}
      locale={locale}
      text={getLegalText(doc, locale)}
      version={LEGAL_UPDATED[doc]}
    />
  );
}
