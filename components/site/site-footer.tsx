import { getLocale, getTranslations } from "next-intl/server";
import { AppLogo } from "@/components/app-logo";
import { Link } from "@/components/nav-link";
import { getLegalText } from "@/lib/legal-content";
import { LEGAL_DOCUMENTS, LEGAL_HREFS } from "@/lib/legal";
import { STATUS_PATH, SUPPORT_EMAIL, WIKI_URL } from "@/lib/links";

const linkClass =
  "text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 rounded-sm text-sm transition-colors outline-none focus-visible:ring-3";

/** Footer of the public site: product, legal and support links. */
export async function SiteFooter() {
  const t = await getTranslations("site");
  const locale = await getLocale();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-muted/30 border-t print:hidden">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-3">
          <Link
            href="/"
            className="focus-visible:ring-ring/50 flex w-fit items-center gap-2 rounded-lg font-semibold outline-none focus-visible:ring-3"
          >
            <AppLogo size={28} className="rounded-lg" />
            Setlyst
          </Link>
          <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
            {t("footer.tagline")}
          </p>
        </div>

        <nav aria-labelledby="footer-product">
          <h2 id="footer-product" className="mb-3 text-sm font-semibold">
            {t("footer.product")}
          </h2>
          <ul className="space-y-2">
            <li>
              <Link href="/#features" className={linkClass}>
                {t("nav.features")}
              </Link>
            </li>
            <li>
              <Link href="/pricing" className={linkClass}>
                {t("nav.pricing")}
              </Link>
            </li>
            <li>
              <Link href="/changelog" className={linkClass}>
                {t("nav.changelog")}
              </Link>
            </li>
            <li>
              <Link href="/register" className={linkClass}>
                {t("signUp")}
              </Link>
            </li>
            <li>
              <Link href="/login" className={linkClass}>
                {t("signIn")}
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-labelledby="footer-legal">
          <h2 id="footer-legal" className="mb-3 text-sm font-semibold">
            {t("footer.legal")}
          </h2>
          <ul className="space-y-2">
            {LEGAL_DOCUMENTS.map((doc) => (
              <li key={doc}>
                <Link href={LEGAL_HREFS[doc]} className={linkClass}>
                  {getLegalText(doc, locale).title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-support">
          <h2 id="footer-support" className="mb-3 text-sm font-semibold">
            {t("footer.support")}
          </h2>
          <ul className="space-y-2">
            <li>
              <a href={`mailto:${SUPPORT_EMAIL}`} className={linkClass}>
                {SUPPORT_EMAIL}
              </a>
            </li>
            <li>
              <a
                href={WIKI_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                {t("footer.docs")}
              </a>
            </li>
            <li>
              <a href={STATUS_PATH} className={linkClass}>
                {t("footer.status")}
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div className="border-t">
        <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>{t("footer.copyright", { year })}</p>
          <p>{t("footer.madeIn")}</p>
        </div>
      </div>
    </footer>
  );
}
