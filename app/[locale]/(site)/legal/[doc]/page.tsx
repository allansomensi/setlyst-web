import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { FileText } from "lucide-react";
import { Link } from "@/components/nav-link";
import { LegalRichText } from "@/components/legal/legal-rich-text";
import { PrintButton } from "@/components/legal/print-button";
import { getLegalText, type LegalBlock } from "@/lib/legal-content";
import {
  LEGAL_DOCUMENTS,
  LEGAL_HREFS,
  LEGAL_VERSION,
  isLegalDocument,
} from "@/lib/legal";
import { publicPageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { formatApiDay } from "@/lib/dates";

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

/** Groups each clause with the lettered list that follows it. */
function groupClauses(blocks: LegalBlock[]) {
  const groups: Array<
    | { kind: "clause"; text: string; list: string[] | null }
    | { kind: "note"; text: string }
  > = [];
  for (const block of blocks) {
    if (typeof block === "string") {
      groups.push({ kind: "clause", text: block, list: null });
    } else if ("list" in block) {
      const last = groups.at(-1);
      if (last?.kind === "clause" && !last.list) last.list = block.list;
      else groups.push({ kind: "clause", text: "", list: block.list });
    } else {
      groups.push({ kind: "note", text: block.note });
    }
  }
  return groups;
}

export default async function LegalPage({ params }: { params: Params }) {
  const { doc, locale } = await params;
  if (!isLegalDocument(doc)) notFound();

  const t = await getTranslations("legal");
  const text = getLegalText(doc, locale);
  const effective = formatApiDay(LEGAL_VERSION, locale);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14 print:max-w-none print:p-0">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)_13rem]">
        {/* Document switcher */}
        <aside className="print:hidden">
          <nav aria-labelledby="legal-docs" className="lg:sticky lg:top-24">
            <h2
              id="legal-docs"
              className="text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase"
            >
              {t("documentsHeading")}
            </h2>
            <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0">
              {LEGAL_DOCUMENTS.map((item) => {
                const current = item === doc;
                return (
                  <li key={item} className="shrink-0">
                    <Link
                      href={LEGAL_HREFS[item]}
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "focus-visible:ring-ring/50 flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm whitespace-nowrap transition-colors outline-none focus-visible:ring-3 lg:border-transparent lg:py-2",
                        current
                          ? "bg-primary/10 text-primary border-primary/30 font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <FileText className="hidden size-4 shrink-0 lg:block" />
                      {getLegalText(item, locale).title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <article className="min-w-0">
          <header className="border-b pb-8">
            <p className="text-primary mb-2 text-sm font-medium">
              {t("title")}
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              {text.title}
            </h1>
            <p className="text-muted-foreground mt-3 max-w-2xl text-lg leading-relaxed">
              {text.summary}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <p className="text-muted-foreground">
                {t("effective", { date: effective })}
                <span aria-hidden> · </span>
                {t("version", { version: LEGAL_VERSION })}
              </p>
              <PrintButton label={t("print")} />
            </div>
          </header>

          {/* Table of contents (inline below xl, sidebar at xl) */}
          <details className="bg-muted/40 mt-8 rounded-xl border p-4 xl:hidden print:hidden">
            <summary className="cursor-pointer text-sm font-semibold">
              {t("toc")}
            </summary>
            <TableOfContents sections={text.sections} />
          </details>

          <div className="mt-8 space-y-10">
            {text.sections.map((section, sectionIndex) => {
              let clause = 0;
              return (
                <section
                  key={section.id}
                  id={section.id}
                  aria-labelledby={`${section.id}-heading`}
                  className="scroll-mt-24 break-inside-avoid-page"
                >
                  <h2
                    id={`${section.id}-heading`}
                    className="text-xl font-semibold tracking-tight"
                  >
                    <span className="text-primary mr-2 tabular-nums">
                      {sectionIndex + 1}.
                    </span>
                    {section.heading}
                  </h2>
                  <div className="mt-4 space-y-4">
                    {groupClauses(section.blocks).map((group, index) => {
                      if (group.kind === "note") {
                        return (
                          <p
                            key={index}
                            className="bg-muted/50 border-primary/40 rounded-r-lg border-l-4 px-4 py-3 text-sm leading-relaxed"
                          >
                            <LegalRichText text={group.text} />
                          </p>
                        );
                      }
                      if (group.text) clause += 1;
                      return (
                        <div key={index} className="leading-relaxed">
                          {group.text && (
                            <p className="flex gap-3">
                              <span className="text-muted-foreground w-10 shrink-0 text-sm tabular-nums">
                                {sectionIndex + 1}.{clause}
                              </span>
                              <span className="text-foreground/90">
                                <LegalRichText text={group.text} />
                              </span>
                            </p>
                          )}
                          {group.list && (
                            <ol className="text-foreground/90 marker:text-muted-foreground mt-3 ml-13 list-[lower-alpha] space-y-2 pl-5">
                              {group.list.map((item) => (
                                <li key={item} className="pl-1">
                                  <LegalRichText text={item} />
                                </li>
                              ))}
                            </ol>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          <p className="text-muted-foreground mt-12 border-t pt-6 text-sm">
            {t("languageNote")}
          </p>
        </article>

        <aside className="hidden xl:block print:hidden">
          <nav aria-labelledby="legal-toc" className="sticky top-24">
            <h2
              id="legal-toc"
              className="text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase"
            >
              {t("toc")}
            </h2>
            <TableOfContents sections={text.sections} compact />
          </nav>
        </aside>
      </div>
    </div>
  );
}

function TableOfContents({
  sections,
  compact = false,
}: {
  sections: { id: string; heading: string }[];
  compact?: boolean;
}) {
  return (
    <ol
      className={cn(
        "space-y-1.5 text-sm",
        compact ? "max-h-[calc(100dvh-10rem)] overflow-y-auto" : "mt-3",
      )}
    >
      {sections.map((section, index) => (
        <li key={section.id}>
          <a
            href={`#${section.id}`}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 flex gap-2 rounded-sm outline-none focus-visible:ring-3"
          >
            <span className="w-5 shrink-0 tabular-nums">{index + 1}.</span>
            <span>{section.heading}</span>
          </a>
        </li>
      ))}
    </ol>
  );
}
