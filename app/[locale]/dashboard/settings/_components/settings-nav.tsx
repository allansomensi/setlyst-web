"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import { scrollIntoDashboard } from "@/lib/scroll-into-dashboard";

export const SETTINGS_SECTIONS = [
  "preferences",
  "security",
  "communications",
  "subscription",
  "data",
  "help",
] as const;
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

const ICONS: Record<SettingsSection, LucideIcon> = {
  preferences: SlidersHorizontal,
  security: ShieldCheck,
  communications: Bell,
  subscription: CreditCard,
  data: Database,
  help: CircleHelp,
};

function scrollToSection(id: SettingsSection) {
  const target = document.getElementById(id);
  if (!target) return;
  scrollIntoDashboard(target, { smooth: true });
  window.history.replaceState(null, "", `#${id}`);
}

/**
 * Settings sub-navigation: a sticky list on large screens, a select on
 * small ones. Highlights the section being read and keeps `#anchor` links
 * (e-mails link to `#communications`) working.
 */
export function SettingsNav() {
  const t = useTranslations("settings.sections");
  const [active, setActive] = useState<SettingsSection>("preferences");

  const sectionParam = useSearchParams()?.get("section") ?? null;

  // `?section=subscription` (links from the pricing page, the plan banner,
  // upgrade prompts; also while already on this page) or a
  // `#subscription` anchor (e-mails).
  useEffect(() => {
    const hash = sectionParam ?? window.location.hash.slice(1);
    if ((SETTINGS_SECTIONS as readonly string[]).includes(hash)) {
      // The page scrolls inside the dashboard's <main>, so make sure the
      // anchor is honoured once everything has rendered.
      requestAnimationFrame(() => {
        const target = document.getElementById(hash);
        if (target) scrollIntoDashboard(target);
      });
    }
  }, [sectionParam]);

  useEffect(() => {
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visible.set(
            entry.target.id,
            entry.isIntersecting ? entry.intersectionRatio : 0,
          );
        }
        // The first section (in page order) that is on screen wins.
        const current = SETTINGS_SECTIONS.find(
          (id) => (visible.get(id) ?? 0) > 0,
        );
        if (current) setActive(current);
      },
      { rootMargin: "-10% 0px -55% 0px", threshold: [0, 0.01, 0.25] },
    );
    for (const id of SETTINGS_SECTIONS) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky -top-4 z-20 -mx-4 border-b px-4 py-2 backdrop-blur md:-top-8 md:-mx-8 md:px-8 lg:hidden">
        <label htmlFor="settings-section" className="sr-only">
          {t("navLabel")}
        </label>
        <NativeSelect
          id="settings-section"
          value={active}
          onChange={(event) => {
            const id = event.target.value as SettingsSection;
            setActive(id);
            scrollToSection(id);
          }}
        >
          {SETTINGS_SECTIONS.map((id) => (
            <option key={id} value={id}>
              {t(id)}
            </option>
          ))}
        </NativeSelect>
      </div>

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
                <a
                  href={`#${id}`}
                  aria-current={isActive ? "location" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    setActive(id);
                    scrollToSection(id);
                  }}
                  className={cn(
                    "focus-visible:ring-ring/50 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-3",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {t(id)}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

/** Heading of one settings section (anchor target). */
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
