import { Link } from "@/components/nav-link";
import { AppLogo } from "@/components/app-logo";
import { getTranslations } from "next-intl/server";
import { STATUS_PATH, WIKI_URL } from "@/lib/links";

/**
 * The frame shared by every signed-out screen (sign in, sign up, password
 * help, mandatory password change): logo, a centered card, and a footer
 * with the legal documents, the wiki and the status page.
 */
export async function AuthShell({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("legal");

  return (
    <div className="bg-muted/40 flex min-h-dvh flex-col items-center justify-center gap-6 p-4">
      {children}
      <footer className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
        <Link
          href="/legal/terms"
          className="hover:text-foreground hover:underline"
        >
          {t("documents.terms.short")}
        </Link>
        <Link
          href="/legal/privacy"
          className="hover:text-foreground hover:underline"
        >
          {t("documents.privacy.short")}
        </Link>
        <Link
          href="/legal/security"
          className="hover:text-foreground hover:underline"
        >
          {t("documents.security.short")}
        </Link>
        <a
          href={WIKI_URL}
          target="_blank"
          rel="noreferrer"
          className="hover:text-foreground hover:underline"
        >
          {t("wiki")}
        </a>
        <a href={STATUS_PATH} className="hover:text-foreground hover:underline">
          {t("status")}
        </a>
      </footer>
    </div>
  );
}

export function AuthLogo() {
  return <AppLogo size={56} priority className="mx-auto mb-2 rounded-xl" />;
}
