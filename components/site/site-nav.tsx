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
      // A Radix Select open inside the panel handles its own Escape (and
      // marks it as handled): only close the menu when nothing else did.
      if (event.key === "Escape" && !event.defaultPrevented) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    // The page behind the panel must not scroll along with it, and the
    // panel has no reason to exist once the viewport grows into the
    // desktop header (rotating a tablet).
    const { overflow } = document.documentElement.style;
    document.documentElement.style.overflow = "hidden";
    const desktop = window.matchMedia("(min-width: 64rem)");
    const onResize = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener("change", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = overflow;
      desktop.removeEventListener("change", onResize);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="lg:hidden">
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

      {/* Tapping outside the panel closes it, like any other overlay.
          Positioned from the header rather than `fixed`: the header's
          backdrop-filter makes it the containing block of fixed
          descendants anyway, so this is what `fixed` would resolve to. */}
      {open && (
        <div
          aria-hidden
          onClick={close}
          className="animate-in fade-in-0 absolute inset-x-0 top-full z-30 h-dvh bg-black/30 duration-150 motion-reduce:animate-none"
        />
      )}
      <div
        id={panelId}
        hidden={!open}
        className="bg-background animate-in fade-in-0 slide-in-from-top-2 absolute inset-x-0 top-full z-40 max-h-[calc(100dvh-4rem-env(safe-area-inset-top))] overflow-y-auto overscroll-contain border-b pb-[env(safe-area-inset-bottom)] shadow-lg duration-150 motion-reduce:animate-none"
      >
        <nav
          aria-label={t("mainNav")}
          className="mx-auto max-w-6xl py-4 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))]"
        >
          <ul className="grid gap-1">
            {SITE_NAV.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  onClick={close}
                  aria-current={
                    isCurrent(pathname, item.href) ? "page" : undefined
                  }
                  className="hover:bg-muted focus-visible:ring-ring/50 aria-[current=page]:bg-muted block rounded-lg px-3 py-2.5 text-base font-medium outline-none focus-visible:ring-3"
                >
                  {t(`nav.${item.key}`)}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-4 grid gap-2 border-t pt-4">
            {signedIn ? (
              <Button asChild size="lg" className="h-11 text-base">
                <Link href="/dashboard" onClick={close}>
                  {t("dashboard")}
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" className="h-11 text-base">
                  <Link href="/register" onClick={close}>
                    {t("signUp")}
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-11 text-base"
                >
                  <Link href="/login" onClick={close}>
                    {t("signIn")}
                  </Link>
                </Button>
              </>
            )}
          </div>

          {/* Preferences as labelled rows: two bare controls side by side
              read as a toolbar nobody asked for, and the language name
              was centred in a stretched box. */}
          <div className="mt-4 grid gap-3 border-t pt-4 pl-3">
            <div className="flex items-center justify-between gap-3">
              <span
                aria-hidden
                className="text-muted-foreground text-sm font-medium"
              >
                {t("language")}
              </span>
              <LocaleSwitcher className="pointer-coarse:min-h-11" />
            </div>
            <ThemeToggle layout="segmented" labelled />
          </div>
        </nav>
      </div>
    </div>
  );
}
