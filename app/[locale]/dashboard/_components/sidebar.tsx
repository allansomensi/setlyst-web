"use client";

import { useState } from "react";
import { Link } from "@/components/nav-link";
import {
  ListMusic,
  ChevronLeft,
  ChevronRight,
  Settings,
  Info,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/routing";
import { SidebarLinks } from "./sidebar-links";
import { NotificationBell } from "./notification-bell";
import { NotificationBellErrorBoundary } from "./notification-bell-error-boundary";
import { LogoutButton } from "./logout-button";
import { cn } from "@/lib/utils";
import { User } from "@/types/api";
import packageJson from "@/package.json";

interface SidebarProps {
  user?: {
    name?: string | null;
    role?: User["role"] | null;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const t = useTranslations("nav");
  const pathname = usePathname();
  const isAbout = pathname.startsWith("/dashboard/about");

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
          "flex h-16 items-center border-b transition-all duration-300",
          isCollapsed ? "justify-center px-0" : "justify-between px-6",
        )}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-2 overflow-hidden text-xl font-bold"
        >
          <ListMusic className="h-6 w-6 shrink-0" />
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

      <SidebarLinks
        isCollapsed={isCollapsed}
        userRole={user?.role as "user" | "moderator" | "admin" | undefined}
      />

      <div
        className={cn(
          "flex items-center border-t p-4 transition-all duration-300",
          isCollapsed
            ? "flex-col justify-center gap-3"
            : "justify-between gap-2",
        )}
      >
        {!isCollapsed && (
          <Link
            href="/dashboard/profile"
            className="group flex-1 cursor-pointer overflow-hidden pr-2 transition-opacity hover:opacity-80"
          >
            <p className="group-hover:text-primary truncate text-sm font-medium transition-colors">
              {user?.name}
            </p>
            <p className="text-muted-foreground truncate text-xs capitalize">
              {user?.role}
            </p>
          </Link>
        )}
        <div
          className={cn(
            "flex items-center",
            isCollapsed ? "flex-col gap-3" : "gap-1",
          )}
        >
          {isCollapsed && (
            <Link
              href="/dashboard/about"
              title={`${t("about")} · v${packageJson.version}`}
              aria-label={t("about")}
              className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-9 w-9 items-center justify-center rounded-md transition-colors"
            >
              <Info className="h-4 w-4" />
            </Link>
          )}
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
