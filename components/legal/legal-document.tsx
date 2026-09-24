import { getTranslations } from "next-intl/server";
import { FileText, History } from "lucide-react";
import { Link } from "@/components/nav-link";
import { LegalRichText } from "@/components/legal/legal-rich-text";
import { PrintButton } from "@/components/legal/print-button";
import {
  getLegalText,
  getLegalVersions,
  type LegalBlock,
  type LegalText,
} from "@/lib/legal-content";
import { LEGAL_DOCUMENTS, LEGAL_HREFS, type LegalDocument } from "@/lib/legal";
import { isAppLocale } from "@/i18n/locales";
import { formatApiDay } from "@/lib/dates";
import { cn } from "@/lib/utils";

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

/** Path of an archived version of a document. */
export function legalVersionHref(doc: LegalDocument, version: string) {
  return `${LEGAL_HREFS[doc]}/v/${version}`;
}

/**
 * A legal document page: document switcher, header with the version in
 * force, numbered sections, table of contents and the version history.
 * Also renders a superseded version (`archived`), with a notice pointing
 * to the version in force.
 */
export async function LegalDocumentView({
  doc,
  locale,
  text,
  version,
  archived,
}: {
  doc: LegalDocument;
  locale: string;
  text: LegalText;
  /** The version shown (ISO date). */
  version: string;
  /** Set when showing a superseded version: until when it was in force. */
  archived?: { until: string };
}) {
  const t = await getTranslations("legal");
  const effective = formatApiDay(version, locale);
  const versions = getLegalVersions(doc);
  const summaryLocale = isAppLocale(locale) ? locale : "en";

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
                      aria-current={current && !archived ? "page" : undefined}
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
                {t("version", { version })}
              </p>
              <PrintButton label={t("print")} />
            </div>
            {archived && (
              <p
                role="note"
                className="mt-5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed"
              >
                {t.rich("archivedNotice", {
                  from: effective,
                  until: formatApiDay(archived.until, locale),
                  current: (chunks) => (
                    <Link
                      href={LEGAL_HREFS[doc]}
                      className="text-primary font-medium underline-offset-4 hover:underline"
                    >
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
            )}
          </header>

          {/* Table of contents (inline below xl, sidebar at xl) */}
          <details className="bg-muted/40 mt-8 rounded-xl border p-4 xl:hidden print:hidden">
            <summary className="cursor-pointer text-sm font-semibold">
              {t("toc")}
            </summary>
            <TableOfContents
              sections={text.sections}
              historyLabel={t("history")}
            />
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

          <section
            id="history"
            aria-labelledby="history-heading"
            className="mt-12 scroll-mt-24 break-inside-avoid-page border-t pt-8"
          >
            <h2
              id="history-heading"
              className="flex items-center gap-2 text-xl font-semibold tracking-tight"
            >
              <History className="text-primary size-5" aria-hidden />
              {t("history")}
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              {t("historyIntro")}
            </p>
            <ol className="mt-4 space-y-3">
              {versions.map((entry, index) => {
                const inForce = index === 0;
                const shown = entry.version === version;
                return (
                  <li
                    key={entry.version}
                    className={cn(
                      "rounded-lg border px-4 py-3 text-sm",
                      shown && "border-primary/40 bg-primary/5",
                    )}
                  >
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
                      <span>
                        {t("historyVersion", {
                          version: entry.version,
                          date: formatApiDay(entry.version, locale),
                        })}
                      </span>
                      {inForce && (
                        <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs">
                          {t("historyCurrent")}
                        </span>
                      )}
                    </p>
                    <p className="text-muted-foreground mt-1 leading-relaxed">
                      {entry.summary[summaryLocale]}
                    </p>
                    {!shown && (
                      <Link
                        href={
                          inForce
                            ? LEGAL_HREFS[doc]
                            : legalVersionHref(doc, entry.version)
                        }
                        className="text-primary mt-1 inline-block text-sm font-medium underline-offset-4 hover:underline print:hidden"
                      >
                        {t("historyView")}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>

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
            <TableOfContents
              sections={text.sections}
              historyLabel={t("history")}
              compact
            />
          </nav>
        </aside>
      </div>
    </div>
  );
}

function TableOfContents({
  sections,
  historyLabel,
  compact = false,
}: {
  sections: { id: string; heading: string }[];
  historyLabel: string;
  compact?: boolean;
}) {
  const linkClass =
    "text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 flex gap-2 rounded-sm outline-none focus-visible:ring-3";
  return (
    <ol
      className={cn(
        "space-y-1.5 text-sm",
        compact ? "max-h-[calc(100dvh-10rem)] overflow-y-auto" : "mt-3",
      )}
    >
      {sections.map((section, index) => (
        <li key={section.id}>
          <a href={`#${section.id}`} className={linkClass}>
            <span className="w-5 shrink-0 tabular-nums">{index + 1}.</span>
            <span>{section.heading}</span>
          </a>
        </li>
      ))}
      <li>
        <a href="#history" className={linkClass}>
          <span className="w-5 shrink-0" aria-hidden />
          <span>{historyLabel}</span>
        </a>
      </li>
    </ol>
  );
}
