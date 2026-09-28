/**
 * The settings categories, each on its own page under
 * `/dashboard/settings`. Preferences, the first one, lives at the root so
 * a plain link to the settings (the sidebar, the offline cache) opens it.
 */
export const SETTINGS_SECTIONS = [
  "preferences",
  "security",
  "communications",
  "subscription",
  "data",
  "help",
] as const;
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export const SETTINGS_ROOT = "/dashboard/settings";

export function isSettingsSection(value: unknown): value is SettingsSection {
  return (SETTINGS_SECTIONS as readonly unknown[]).includes(value);
}

/** Path of a category's page (without the locale). */
export function settingsHref(section: SettingsSection): string {
  return section === "preferences"
    ? SETTINGS_ROOT
    : `${SETTINGS_ROOT}/${section}`;
}

/**
 * The category a settings path shows (`pathname` without the locale), or
 * null outside the settings.
 */
export function sectionOfPath(pathname: string): SettingsSection | null {
  const path = pathname.replace(/\/+$/, "");
  if (path === SETTINGS_ROOT) return "preferences";
  if (!path.startsWith(`${SETTINGS_ROOT}/`)) return null;
  const segment = path.slice(SETTINGS_ROOT.length + 1).split("/")[0];
  return isSettingsSection(segment) ? segment : null;
}
