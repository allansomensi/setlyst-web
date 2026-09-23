import { getTranslations } from "next-intl/server";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import "./site.css";

/**
 * Frame of the public site: landing, pricing, changelog, legal texts and
 * the unsubscribe page. None of these require a session (see
 * lib/route-access.ts), and signed-in visitors can open them too.
 */
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("site");

  return (
    <div className="bg-background flex min-h-dvh flex-col">
      <a
        href="#main"
        className="bg-primary text-primary-foreground focus-visible:ring-ring/50 sr-only z-50 rounded-md px-4 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus-visible:ring-3"
      >
        {t("skipToContent")}
      </a>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
