"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Link } from "@/components/nav-link";
import { usePathname } from "@/i18n/routing";
import {
  Calendar,
  Home,
  ListMusic,
  Menu,
  Music,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react";
import { AppLogo } from "@/components/app-logo";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { isActive, SidebarLinks } from "./sidebar-links";
import { NotificationBell } from "./notification-bell";
import { NotificationBellErrorBoundary } from "./notification-bell-error-boundary";
import { LogoutButton } from "./logout-button";
import { HelpMenu } from "./help-menu";
import { WhatsNewLink } from "./whats-new-link";
import { ROLE_TEXT_STYLES } from "@/components/role-badge";
import { cn } from "@/lib/utils";
import type { SidebarUser } from "./sidebar";
import { TrialStatus } from "./trial/trial-status";
import type { AccountPlanStatus } from "@/lib/trial";
import packageJson from "@/package.json";

/**
 * Horizontal safe-area padding: in landscape on a notched phone the
 * installed app draws under the notch on one side.
 */
const SAFE_X =
  "pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))]";

/**
 * Whether the phone menu is open. Shared by the top bar (which owns the
 * drawer) and the tab bar at the bottom (whose "More" tab opens it), which
 * sit on either side of the page in the layout.
 */
const MobileMenuContext = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
} | null>(null);

export function MobileMenuProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <MobileMenuContext.Provider value={{ open, setOpen }}>
      {children}
    </MobileMenuContext.Provider>
  );
}

function useMobileMenu() {
  const context = useContext(MobileMenuContext);
  if (!context) throw new Error("MobileMenuProvider is missing");
  return context;
}

/**
 * The phone's top bar: the logo, the plan chip and notifications. The
 * sections are one thumb away in the tab bar at the bottom
 * ({@link MobileTabBar}), and everything else in the drawer it opens.
 */
export function MobileNav({
  user,
  planStatus = null,
}: {
  user?: SidebarUser;
  planStatus?: AccountPlanStatus | null;
}) {
  const t = useTranslations("nav");

  return (
    // `pt` for the status bar / notch: the installed iOS app draws under
    // it (black-translucent status bar + viewport-fit=cover).
    <header
      className={cn(
        "bg-sidebar text-sidebar-foreground border-sidebar-border shrink-0 border-b pt-[env(safe-area-inset-top)] md:hidden",
        SAFE_X,
      )}
    >
      <div className="flex h-14 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-lg font-bold"
          >
            <AppLogo size={26} priority className="rounded-md" />
            <span>Setlyst</span>
          </Link>
          {/* No room for it next to everything else on a 360px phone; it
              is in the drawer's footer instead. */}
          <Link
            href="/dashboard/about"
            aria-label={`${t("about")} · v${packageJson.version}`}
            className="bg-muted/40 text-muted-foreground hidden rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium sm:inline-block"
          >
            v{packageJson.version}
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <TrialStatus status={planStatus} collapsed />
          <NotificationBellErrorBoundary>
            <NotificationBell />
          </NotificationBellErrorBoundary>
        </div>
      </div>

      <MobileDrawer user={user} planStatus={planStatus} />
    </header>
  );
}

/**
 * Everything the tab bar has no room for: every section, the account, and
 * help, settings and sign out. A side drawer over the page (Radix dialog:
 * focus is trapped, Escape and the backdrop close it, focus returns to the
 * tab that opened it).
 */
function MobileDrawer({
  user,
  planStatus,
}: {
  user?: SidebarUser;
  planStatus: AccountPlanStatus | null;
}) {
  const { open, setOpen } = useMobileMenu();
  const t = useTranslations("nav");
  const tRoles = useTranslations("roles");
  const role = user?.role ?? "user";
  const close = () => setOpen(false);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 fixed inset-0 z-50 bg-black/40 duration-200 motion-reduce:animate-none md:hidden" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "bg-background fixed inset-y-0 right-0 z-50 flex w-[min(20rem,86vw)] flex-col border-l shadow-2xl outline-none md:hidden",
            "data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right duration-200 motion-reduce:animate-none",
            "pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)]",
          )}
        >
          <div className="flex items-center gap-3 border-b px-4 py-3">
            <Link
              href="/dashboard/profile"
              onClick={close}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-lg"
            >
              {user?.id && (
                <UserAvatar
                  userId={user.id}
                  name={user.name ?? ""}
                  avatarUrl={user.avatarUrl}
                  size="md"
                />
              )}
              <div className="min-w-0">
                <DialogPrimitive.Title className="truncate text-base font-semibold">
                  {user?.name ?? t("menu")}
                </DialogPrimitive.Title>
                <p className={cn("truncate text-xs", ROLE_TEXT_STYLES[role])}>
                  {tRoles(role)}
                  <span className="text-muted-foreground">
                    {" · "}
                    {t("profile")}
                  </span>
                </p>
              </div>
            </Link>
            <DialogPrimitive.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0"
                aria-label={t("closeMenu")}
              >
                <X className="h-5 w-5" aria-hidden />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <nav
            aria-label={t("menu")}
            className="flex-1 overflow-y-auto overscroll-contain py-2"
            onClick={(event) => {
              // Any link followed from the list closes the drawer.
              if ((event.target as Element).closest("a[href]")) close();
            }}
          >
            <SidebarLinks isCollapsed={false} userRole={role} />
          </nav>

          {planStatus && (
            <div className="border-t px-4 pt-3">
              <TrialStatus status={planStatus} onNavigate={close} />
            </div>
          )}

          <div className="flex items-center justify-between gap-1 border-t px-3 py-3">
            <Link
              href="/dashboard/about"
              onClick={close}
              className="text-muted-foreground px-1 font-mono text-[11px]"
            >
              v{packageJson.version}
            </Link>
            <div className="flex items-center gap-1">
              <WhatsNewLink onNavigate={close} />
              <HelpMenu onNavigate={close} />
              <Link
                href="/dashboard/settings"
                onClick={close}
                aria-label={t("settings")}
                title={t("settings")}
                className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-10 items-center justify-center rounded-md transition-colors"
              >
                <Settings className="h-5 w-5" aria-hidden />
              </Link>
              <LogoutButton />
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

const TABS: { key: string; href: string; icon: LucideIcon }[] = [
  { key: "home", href: "/dashboard", icon: Home },
  { key: "songs", href: "/dashboard/songs", icon: Music },
  { key: "setlists", href: "/dashboard/setlists", icon: ListMusic },
  { key: "gigs", href: "/dashboard/gigs", icon: Calendar },
];

/**
 * The phone's main navigation, at the bottom where the thumb reaches: the
 * four sections used most, and "More" for the drawer. Below the page in
 * the layout's column (not fixed), so it never covers content, and padded
 * for the home indicator of the installed iOS app.
 */
export function MobileTabBar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { open, setOpen } = useMobileMenu();
  // "More" is the current tab when no other one is.
  const inTab = TABS.some((tab) => isActive(pathname, tab.href));

  const tabClass = (active: boolean) =>
    cn(
      "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 text-[11px] font-medium transition-colors",
      "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
      active
        ? "text-primary"
        : "text-muted-foreground hover:text-foreground active:bg-muted/60",
    );

  return (
    <nav
      aria-label={t("menu")}
      className={cn(
        "bg-sidebar/95 border-sidebar-border shrink-0 border-t pb-[env(safe-area-inset-bottom)] md:hidden",
        "pr-[max(0.5rem,env(safe-area-inset-right))] pl-[max(0.5rem,env(safe-area-inset-left))]",
      )}
    >
      <ul className="flex h-14 items-stretch gap-1 py-1">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={tabClass(active)}
              >
                <Icon
                  className="h-5 w-5"
                  strokeWidth={active ? 2.4 : 2}
                  aria-hidden
                />
                <span className="max-w-full truncate">{t(tab.key)}</span>
              </Link>
            </li>
          );
        })}
        <li className="flex flex-1">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={open}
            className={tabClass(!inTab || open)}
          >
            <Menu className="h-5 w-5" aria-hidden />
            <span>{t("more")}</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
