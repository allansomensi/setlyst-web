"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { Link } from "@/components/nav-link";
import { Button } from "@/components/ui/button";
import { usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { LocaleSwitcher } from "./locale-switcher";
import { ThemeToggle } from "./theme-toggle";

export const SITE_NAV = [
  { key: "features", href: "/#features" },
  { key: "pricing", href: "/pricing" },
  { key: "changelog", href: "/changelog" },
] as const;

function isCurrent(pathname: string, href: string): boolean {
  const path = href.split("#")[0] || "/";
  return path !== "/" && (pathname === path || pathname.startsWith(`${path}/`));
}

/** Primary navigation links of the public header (desktop). */
export function SiteNav({ className }: { className?: string }) {
  const t = useTranslations("site.nav");
  const pathname = usePathname();

  return (
    <ul className={cn("flex items-center gap-1", className)}>
      {SITE_NAV.map((item) => {
        const current = isCurrent(pathname, item.href);
        return (
          <li key={item.key}>
            <Link
              href={item.href}
              aria-current={current ? "page" : undefined}
              className={cn(
                "focus-visible:ring-ring/50 rounded-md px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-3",
                current
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(item.key)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The header's menu on small screens: a disclosure panel with the
 * navigation, the account links, and the language and theme pickers.
 */
export function SiteMobileMenu({ signedIn }: { signedIn: boolean }) {
  const t = useTranslations("site");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);
  const panelId = useId();

  // Close when the route changes (a link in the panel was followed).
  if (open && openedAt !== pathname) {
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon-lg"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? t("closeMenu") : t("openMenu")}
        onClick={() => {
          setOpenedAt(pathname);
          setOpen((value) => !value);
        }}
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </Button>

      <div
        id={panelId}
        hidden={!open}
        className="bg-background absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border-b shadow-lg"
      >
        <nav aria-label={t("mainNav")} className="mx-auto max-w-6xl px-4 py-4">
          <ul className="grid gap-1">
            {SITE_NAV.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  onClick={close}
                  aria-current={
                    isCurrent(pathname, item.href) ? "page" : undefined
                  }
                  className="hover:bg-muted focus-visible:ring-ring/50 block rounded-lg px-3 py-2.5 text-base font-medium outline-none focus-visible:ring-3"
                >
                  {t(`nav.${item.key}`)}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-4 grid gap-2 border-t pt-4">
            {signedIn ? (
              <Button asChild size="lg" className="h-10">
                <Link href="/dashboard" onClick={close}>
                  {t("dashboard")}
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" className="h-10">
                  <Link href="/register" onClick={close}>
                    {t("signUp")}
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-10">
                  <Link href="/login" onClick={close}>
                    {t("signIn")}
                  </Link>
                </Button>
              </>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </div>
  );
}
