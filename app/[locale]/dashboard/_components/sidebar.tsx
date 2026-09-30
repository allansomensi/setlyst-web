"use client";

import { useCallback, useState } from "react";
import {
  SIDEBAR_COLLAPSED_COOKIE,
  SIDEBAR_COOKIE_MAX_AGE,
} from "@/lib/sidebar-cookie";
import { Link } from "@/components/nav-link";
import { ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/routing";
import { SidebarLinks, isActive } from "./sidebar-links";
import { AppLogo } from "@/components/app-logo";
import { NotificationBell } from "./notification-bell";
import { NotificationBellErrorBoundary } from "./notification-bell-error-boundary";
import { LogoutButton } from "./logout-button";
import { HelpMenu } from "./help-menu";
import { WhatsNewLink } from "./whats-new-link";
import { TrialStatus } from "./trial/trial-status";
import type { AccountPlanStatus } from "@/lib/trial";
import { ROLE_TEXT_STYLES } from "@/components/role-badge";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/api";
import packageJson from "@/package.json";

export interface SidebarUser {
  id?: string | null;
  name?: string | null;
  /** First and last name, when the profile has them. */
  displayName?: string | null;
  role?: UserRole | null;
  avatarUrl?: string | null;
}

/**
 * Whether the sidebar is folded to icons, remembered per device in a
 * cookie (`SIDEBAR_COLLAPSED_COOKIE`) rather than localStorage: the
 * dashboard layout reads it on the server, so the page arrives already
 * folded, with no expanded frame and no slide on every load, and no
 * hydration mismatch, since server and client render the same state.
 */
function useSidebarCollapsed(initial: boolean) {
  const [collapsed, setCollapsedState] = useState(initial);
  const setCollapsed = useCallback((next: boolean) => {
    setCollapsedState(next);
    try {
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${SIDEBAR_COLLAPSED_COOKIE}=${next ? "1" : "0"}; Path=/; Max-Age=${SIDEBAR_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
    } catch {
      // Cookies blocked: applies to this page only.
    }
  }, []);
  return [collapsed, setCollapsed] as const;
}

/** The focus ring every control in the sidebar shares (as NotificationBell). */
const FOCUS_RING =
  "focus-visible:ring-ring/50 outline-none focus-visible:ring-3";

export function Sidebar({
  user,
  planStatus = null,
  initialCollapsed = false,
}: {
  user?: SidebarUser;
  planStatus?: AccountPlanStatus | null;
  /** The remembered fold state, read from the cookie by the layout. */
  initialCollapsed?: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useSidebarCollapsed(initialCollapsed);
  const t = useTranslations("nav");
  const tRoles = useTranslations("roles");
  const pathname = usePathname();
  const isAbout = pathname.startsWith("/dashboard/about");
  const isSettings = isActive(pathname, "/dashboard/settings");
  const role = user?.role ?? "user";

  return (
    <aside
      className={cn(
        "bg-sidebar text-sidebar-foreground border-sidebar-border relative hidden flex-col border-r transition-[width] duration-300 md:flex",
        isCollapsed ? "w-20" : "w-64",
      )}
    >
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-label={isCollapsed ? t("expandSidebar") : t("collapseSidebar")}
        // Says whether the sidebar is open now, not just what a press does.
        aria-expanded={!isCollapsed}
        title={isCollapsed ? t("expandSidebar") : t("collapseSidebar")}
        className={cn(
          "bg-card text-muted-foreground hover:bg-muted hover:text-foreground absolute top-6 -right-3 z-10 flex h-6 w-6 items-center justify-center rounded-full border shadow-sm transition-colors",
          FOCUS_RING,
        )}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" aria-hidden />
        ) : (
          <ChevronLeft className="h-4 w-4" aria-hidden />
        )}
      </button>

      <div
        className={cn(
          "border-sidebar-border flex h-16 shrink-0 items-center border-b transition-[padding] duration-300",
          isCollapsed ? "justify-center px-0" : "justify-between px-6",
        )}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-2 overflow-hidden text-xl font-bold"
        >
          <AppLogo size={28} priority className="rounded-md" />
          {!isCollapsed && <span className="truncate">Setlyst</span>}
        </Link>

        {!isCollapsed && (
          <Link
            href="/dashboard/about"
            title={t("about")}
            aria-label={`${t("about")} · v${packageJson.version}`}
            className={cn(
              "hover:border-primary/40 hover:text-foreground rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium transition-colors",
              isAbout
                ? "border-primary/40 bg-primary/10 text-primary"
                : "bg-card/60 text-muted-foreground",
            )}
          >
            v{packageJson.version}
          </Link>
        )}
      </div>

      <SidebarLinks isCollapsed={isCollapsed} userRole={role} />

      <div className="border-sidebar-border shrink-0 border-t p-3">
        <TrialStatus
          status={planStatus}
          collapsed={isCollapsed}
          className={cn("mb-2", isCollapsed && "mx-auto")}
        />
        <Link
          href="/dashboard/profile"
          title={isCollapsed ? (user?.name ?? t("profile")) : t("profile")}
          aria-label={isCollapsed ? t("profile") : undefined}
          className={cn(
            "group hover:bg-sidebar-accent/60 mb-2 flex items-center overflow-hidden rounded-md transition-colors",
            isCollapsed
              ? "mx-auto w-fit justify-center p-1"
              : "gap-2.5 px-2 py-1.5",
          )}
        >
          <UserAvatar
            userId={user?.id ?? user?.name ?? ""}
            name={user?.displayName || user?.name || ""}
            avatarUrl={user?.id ? user.avatarUrl : null}
            size="sm"
          />
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="group-hover:text-primary truncate text-sm font-medium transition-colors">
                {user?.displayName || user?.name}
              </p>
              {/* The role only says something for staff; everyone else
                  sees the @handle other musicians know them by. */}
              {role === "user" ? (
                <p className="text-muted-foreground truncate text-xs">
                  @{user?.name}
                </p>
              ) : (
                <p className={cn("truncate text-xs", ROLE_TEXT_STYLES[role])}>
                  {tRoles(role)}
                </p>
              )}
            </div>
          )}
        </Link>
        <div
          className={cn(
            "flex items-center",
            isCollapsed ? "flex-col gap-2" : "justify-between gap-1",
          )}
        >
          <WhatsNewLink />
          <HelpMenu />
          <Link
            href="/dashboard/settings"
            title={t("settings")}
            aria-label={t("settings")}
            // Marked like the nav links when on any Settings page.
            aria-current={isSettings ? "page" : undefined}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
              FOCUS_RING,
              isSettings
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <Settings className="h-4 w-4" aria-hidden />
          </Link>
          <NotificationBellErrorBoundary>
            <NotificationBell isCollapsed={isCollapsed} />
          </NotificationBellErrorBoundary>
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
