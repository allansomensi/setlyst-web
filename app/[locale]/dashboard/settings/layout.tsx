import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { SettingsNav } from "./_components/settings-nav";

/**
 * The settings: one page per category (preferences, security, …) beside
 * a shared navigation, so each page only loads and shows what it's about.
 */
export default async function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const t = await getTranslations("settings");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
        <SettingsNav />
        <div className="min-w-0 pt-4 lg:pt-0">{children}</div>
      </div>
    </div>
  );
}
