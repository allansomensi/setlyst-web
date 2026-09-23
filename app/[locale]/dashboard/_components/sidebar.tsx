"use client";

import { useState } from "react";
import { Link } from "@/components/nav-link";
import { ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/routing";
import { SidebarLinks } from "./sidebar-links";
import { AppLogo } from "@/components/app-logo";
import { NotificationBell } from "./notification-bell";
import { NotificationBellErrorBoundary } from "./notification-bell-error-boundary";
import { LogoutButton } from "./logout-button";
import { HelpMenu } from "./help-menu";
import { WhatsNewLink } from "./whats-new-link";
import { ROLE_TEXT_STYLES } from "@/components/role-badge";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/api";
import packageJson from "@/package.json";

export interface SidebarUser {
  name?: string | null;
  role?: UserRole | null;
}

export function Sidebar({ user }: { user?: SidebarUser }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const t = useTranslations("nav");
  const tRoles = useTranslations("roles");
  const pathname = usePathname();
  const isAbout = pathname.startsWith("/dashboard/about");
  const role = user?.role ?? "user";

  return (
    <aside
      className={cn(
        "bg-background relative hidden flex-col border-r transition-all duration-300 md:flex",
        isCollapsed ? "w-20" : "w-64",
      )}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-label={isCollapsed ? t("expandSidebar") : t("collapseSidebar")}
        title={isCollapsed ? t("expandSidebar") : t("collapseSidebar")}
        className="bg-background text-muted-foreground hover:bg-muted hover:text-foreground absolute top-6 -right-3 z-10 flex h-6 w-6 items-center justify-center rounded-full border shadow-sm transition-colors"
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b transition-all duration-300",
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
                : "bg-muted/40 text-muted-foreground",
            )}
          >
            v{packageJson.version}
          </Link>
        )}
      </div>

      <SidebarLinks isCollapsed={isCollapsed} userRole={role} />

      <div className="shrink-0 border-t p-3">
        {!isCollapsed && (
          <Link
            href="/dashboard/profile"
            title={t("profile")}
            className="group hover:bg-muted mb-2 block overflow-hidden rounded-md px-2 py-1.5 transition-colors"
          >
            <p className="group-hover:text-primary truncate text-sm font-medium transition-colors">
              {user?.name}
            </p>
            <p className={cn("truncate text-xs", ROLE_TEXT_STYLES[role])}>
              {tRoles(role)}
            </p>
          </Link>
        )}
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
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-9 w-9 items-center justify-center rounded-md transition-colors"
          >
            <Settings className="h-4 w-4" />
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
