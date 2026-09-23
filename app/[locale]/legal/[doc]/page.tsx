import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { AppLogo } from "@/components/app-logo";
import { Link } from "@/components/nav-link";
import { getLegalText, LEGAL_UPDATED } from "@/lib/legal-content";
import {
  isLegalDocument,
  LEGAL_DOCUMENTS,
  STATUS_PATH,
  WIKI_URL,
} from "@/lib/links";
import { cn } from "@/lib/utils";

type Params = Promise<{ locale: string; doc: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { doc, locale } = await params;
  if (!isLegalDocument(doc)) return {};
  const text = getLegalText(doc, locale);
  return { title: text.title, description: text.summary };
}

export default async function LegalPage({ params }: { params: Params }) {
  const { doc } = await params;
  if (!isLegalDocument(doc)) notFound();

  const locale = await getLocale();
  const t = await getTranslations("legal");
  const text = getLegalText(doc, locale);
  const updated = new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${LEGAL_UPDATED[doc]}T00:00:00Z`));

  return (
    <div className="bg-muted/30 min-h-dvh">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
        <header className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <AppLogo size={32} className="rounded-lg" />
            Setlyst
          </Link>
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("backToApp")}
          </Link>
        </header>

        <nav aria-label={t("title")} className="mb-6 flex flex-wrap gap-2">
          {LEGAL_DOCUMENTS.map((item) => (
            <Link
              key={item}
              href={`/legal/${item}`}
              aria-current={item === doc ? "page" : undefined}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                item === doc
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-muted",
              )}
            >
              {getLegalText(item, locale).title}
            </Link>
          ))}
        </nav>

        <article className="bg-background space-y-8 rounded-xl border p-6 shadow-sm sm:p-10">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">{text.title}</h1>
            <p className="text-muted-foreground">{text.summary}</p>
            <p className="text-muted-foreground text-xs">
              {t("updated", { date: updated })}
            </p>
          </div>
          {text.sections.map((section) => (
            <section key={section.heading} className="space-y-2">
              <h2 className="text-lg font-semibold">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p
                  key={paragraph}
                  className="text-muted-foreground leading-relaxed"
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </article>

        <footer className="text-muted-foreground mt-6 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
          <a
            href={WIKI_URL}
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground hover:underline"
          >
            {t("wiki")}
          </a>
          <a
            href={STATUS_PATH}
            className="hover:text-foreground hover:underline"
          >
            {t("status")}
          </a>
        </footer>
      </div>
    </div>
  );
}
