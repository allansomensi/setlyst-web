import type { ReactNode } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { SettingsSection } from "../_lib/sections";
import { SettingsSectionHeading } from "./settings-nav";

/** `<title>` of a settings page: "Security · Settings". */
export async function settingsMetadata(
  section: SettingsSection,
): Promise<Metadata> {
  const t = await getTranslations("settings");
  return { title: `${t(`sections.${section}`)} · ${t("title")}` };
}

/** One settings page: its heading and its cards. */
export async function SettingsPage({
  section,
  children,
}: {
  section: SettingsSection;
  children: ReactNode;
}) {
  const t = await getTranslations("settings");
  return (
    <section
      id={section}
      className="space-y-4"
      aria-labelledby={`${section}-title`}
    >
      <SettingsSectionHeading
        id={`${section}-title`}
        title={t(`sections.${section}`)}
        description={t(`sectionDescriptions.${section}`)}
      />
      {children}
    </section>
  );
}
