import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/components/nav-link";
import { AppLogo } from "@/components/app-logo";
import { LocaleSwitcher } from "@/components/site/locale-switcher";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { getLegalText } from "@/lib/legal-content";
import { LEGAL_HREFS, type LegalDocument } from "@/lib/legal";
import { STATUS_PATH, WIKI_URL } from "@/lib/links";

export { AuthLogo } from "./auth-logo";

/** Documents linked from every sign-in / sign-up screen. */
const AUTH_LEGAL_DOCS: LegalDocument[] = [
  "terms",
  "privacy",
  "cookies",
  "guidelines",
];

const footerLink =
  "hover:text-foreground focus-visible:ring-ring/50 rounded-sm outline-none hover:underline focus-visible:ring-3";

/**
 * The frame shared by every signed-out screen (sign in, sign up, password
 * help, mandatory password change): a slim header matching the public
 * site (logo back to the landing page, language and theme), a centered
 * card, and a footer with the legal documents, the wiki and the status
 * page.
 */
export async function AuthShell({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("site");
  const tLegal = await getTranslations("legal");
  const locale = await getLocale();

  return (
    <div className="bg-muted/40 flex min-h-dvh flex-col">
      {/* Safe areas: the installed iOS app's status bar and home
          indicator, and the notches of a phone in landscape. */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-4 pl-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))] sm:pl-[max(1.5rem,env(safe-area-inset-left))]">
        <Link
          href="/"
          className="focus-visible:ring-ring/50 flex items-center gap-2 rounded-lg font-semibold outline-none focus-visible:ring-3"
        >
          <AppLogo size={28} className="rounded-lg" />
          <span>Setlyst</span>
          <span className="sr-only">: {t("backToSite")}</span>
        </Link>
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle className="hidden sm:flex" />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center py-4 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))]">
        {children}
      </main>

      <footer className="text-muted-foreground flex flex-col items-center gap-2 px-4 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-xs">
        <nav aria-label={tLegal("title")}>
          <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            {AUTH_LEGAL_DOCS.map((doc) => (
              <li key={doc}>
                <Link href={LEGAL_HREFS[doc]} className={footerLink}>
                  {getLegalText(doc, locale).title}
                </Link>
              </li>
            ))}
            <li>
              <a
                href={WIKI_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={footerLink}
              >
                {tLegal("wiki")}
              </a>
            </li>
            <li>
              <a href={STATUS_PATH} className={footerLink}>
                {tLegal("status")}
              </a>
            </li>
          </ul>
        </nav>
        <p>{t("footer.copyright", { year: new Date().getFullYear() })}</p>
      </footer>
    </div>
  );
}
