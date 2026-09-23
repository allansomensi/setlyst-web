import { getTranslations } from "next-intl/server";
import { AppLogo } from "@/components/app-logo";
import { Link } from "@/components/nav-link";
import { Button } from "@/components/ui/button";
import { isSignedIn } from "@/lib/site-session";
import { LocaleSwitcher } from "./locale-switcher";
import { SiteMobileMenu, SiteNav } from "./site-nav";
import { ThemeToggle } from "./theme-toggle";

/**
 * Header of the public site (landing, pricing, changelog, legal texts).
 * Signed-in visitors see "Ir para o painel" instead of the sign-in and
 * sign-up buttons; nobody is ever redirected away from these pages.
 */
export async function SiteHeader() {
  const t = await getTranslations("site");
  const signedIn = await isSignedIn();

  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-40 border-b backdrop-blur print:hidden">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="focus-visible:ring-ring/50 -ml-1 flex items-center gap-2 rounded-lg px-1 py-1 font-semibold tracking-tight outline-none focus-visible:ring-3"
        >
          <AppLogo size={30} priority className="rounded-lg" />
          <span className="text-lg">Setlyst</span>
        </Link>

        <nav aria-label={t("mainNav")} className="ml-4 hidden md:block">
          <SiteNav />
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <LocaleSwitcher />
          <ThemeToggle />
          <span aria-hidden className="bg-border mx-1 h-6 w-px" />
          {signedIn ? (
            <Button asChild size="lg">
              <Link href="/dashboard">{t("dashboard")}</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="lg">
                <Link href="/login">{t("signIn")}</Link>
              </Button>
              <Button asChild size="lg">
                <Link href="/register">{t("signUp")}</Link>
              </Button>
            </>
          )}
        </div>

        <div className="ml-auto md:hidden">
          <SiteMobileMenu signedIn={signedIn} />
        </div>
      </div>
    </header>
  );
}
