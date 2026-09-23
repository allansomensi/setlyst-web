import { useTranslations } from "next-intl";
import { AppLogo } from "@/components/app-logo";
import { Link } from "@/components/nav-link";

/**
 * The logo at the top of an auth card, linking back to the landing page.
 * Works in server and client components alike.
 */
export function AuthLogo() {
  const t = useTranslations("site");
  return (
    <Link
      href="/"
      aria-label={t("backToSite")}
      className="focus-visible:ring-ring/50 mx-auto mb-2 block w-fit rounded-xl outline-none focus-visible:ring-3"
    >
      <AppLogo size={56} priority className="rounded-xl" />
    </Link>
  );
}
