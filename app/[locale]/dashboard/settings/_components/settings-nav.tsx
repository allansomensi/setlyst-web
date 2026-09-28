"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  CreditCard,
  Database,
  CircleHelp,
  Bell,
  ShieldCheck,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/components/nav-link";
import { usePathname, useRouter } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import {
  SETTINGS_SECTIONS,
  isSettingsSection,
  sectionOfPath,
  settingsHref,
  type SettingsSection,
} from "../_lib/sections";

const ICONS: Record<SettingsSection, LucideIcon> = {
  preferences: SlidersHorizontal,
  security: ShieldCheck,
  communications: Bell,
  subscription: CreditCard,
  data: Database,
  help: CircleHelp,
};

/**
 * Settings navigation, one page per category (like most apps with many
 * settings): a sticky list beside the page on large screens, a row of
 * tabs that scrolls sideways above it on small ones.
 */
export function SettingsNav() {
  const t = useTranslations("settings.sections");
  const pathname = usePathname();
  const active = sectionOfPath(pathname) ?? "preferences";
  const tabsRef = useRef<HTMLUListElement>(null);

  useLegacyAnchor(active);

  // The active tab in view on phones (e.g. "Help", the last one). Only
  // the tab row scrolls: `scrollIntoView` would move the page as well.
  useEffect(() => {
    const list = tabsRef.current;
    const tab = list?.querySelector<HTMLElement>("[aria-current='page']");
    if (!list || !tab) return;
    const start = tab.offsetLeft - list.offsetLeft;
    const end = start + tab.offsetWidth;
    if (start < list.scrollLeft || end > list.scrollLeft + list.clientWidth) {
      list.scrollLeft = start - 16;
    }
  }, [active]);

  return (
    <>
      <nav
        aria-label={t("navLabel")}
        className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky -top-4 z-20 -mx-4 border-b backdrop-blur md:-top-8 md:-mx-8 lg:hidden"
      >
        <ul
          ref={tabsRef}
          className="flex [scrollbar-width:none] gap-1 overflow-x-auto px-4 py-2 md:px-8 [&::-webkit-scrollbar]:hidden"
        >
          {SETTINGS_SECTIONS.map((id) => {
            const Icon = ICONS[id];
            const isActive = active === id;
            return (
              <li key={id} className="shrink-0">
                <Link
                  href={settingsHref(id)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "focus-visible:ring-ring/50 flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {t(id)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <nav
        aria-label={t("navLabel")}
        className="hidden lg:sticky lg:top-0 lg:block lg:self-start lg:pt-1"
      >
        <ul className="space-y-0.5">
          {SETTINGS_SECTIONS.map((id) => {
            const Icon = ICONS[id];
            const isActive = active === id;
            return (
              <li key={id}>
                <Link
                  href={settingsHref(id)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "focus-visible:ring-ring/50 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-3",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {t(id)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

/**
 * Links from before the settings were split into pages point at an anchor
 * of the old single page (`/dashboard/settings#communications`, in
 * e-mails and notifications already sent). The anchor never reaches the
 * server, so the category's page is opened from here, keeping the query
 * (`?checkout=success`, `?google=linked`).
 */
function useLegacyAnchor(active: SettingsSection) {
  const router = useRouter();

  useEffect(() => {
    if (active !== "preferences") return;
    const anchor = window.location.hash.slice(1);
    if (!isSettingsSection(anchor) || anchor === "preferences") return;
    router.replace(`${settingsHref(anchor)}${window.location.search}`);
  }, [active, router]);
}

/** Heading of a settings page. */
export function SettingsSectionHeading({
  id,
  title,
  description,
}: {
  id?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-1 border-b pb-3">
      <h2 id={id} className="text-xl font-semibold tracking-tight">
        {title}
      </h2>
      {description && (
        <p className="text-muted-foreground text-sm">{description}</p>
      )}
    </div>
  );
}
