"use client";

import { useState } from "react";
import { Link } from "@/components/nav-link";
import { ListMusic, Menu, X, Settings, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SidebarLinks } from "./sidebar-links";
import { NotificationBell } from "./notification-bell";
import { NotificationBellErrorBoundary } from "./notification-bell-error-boundary";
import { LogoutButton } from "./logout-button";
import { User } from "@/types/api";
import packageJson from "@/package.json";

export function MobileNav({
  user,
}: {
  user?: { name?: string | null; role?: User["role"] | null };
}) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("nav");

  return (
    <div className="bg-background flex h-16 items-center justify-between border-b px-4 md:hidden">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-xl font-bold"
        >
          <ListMusic className="text-primary h-6 w-6" />
          <span>Setlyst</span>
        </Link>
        <Link
          href="/dashboard/about"
          aria-label={`${t("about")} · v${packageJson.version}`}
          className="bg-muted/40 text-muted-foreground rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium"
        >
          v{packageJson.version}
        </Link>
      </div>

      <div className="flex items-center gap-1">
        <NotificationBellErrorBoundary>
          <NotificationBell />
        </NotificationBellErrorBoundary>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          onClick={() => setIsOpen(true)}
          aria-label={t("openMenu")}
          aria-expanded={isOpen}
        >
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      {isOpen && (
        <div className="bg-background animate-in slide-in-from-right fixed inset-0 z-50 flex flex-col duration-300">
          <div className="flex h-16 items-center justify-between border-b px-4">
            <span className="text-xl font-bold">{t("menu")}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={() => setIsOpen(false)}
              aria-label={t("closeMenu")}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          <div
            className="flex-1 overflow-y-auto py-4"
            onClick={() => setIsOpen(false)}
          >
            <SidebarLinks
              isCollapsed={false}
              userRole={
                user?.role as "user" | "moderator" | "admin" | undefined
              }
            />
          </div>

          <div className="flex items-center justify-between gap-2 border-t p-4">
            <Link
              href="/dashboard/profile"
              className="flex-1 overflow-hidden pr-2"
              onClick={() => setIsOpen(false)}
            >
              <div>
                <p className="truncate text-sm font-medium">{user?.name}</p>
                <p className="text-muted-foreground truncate text-xs capitalize">
                  {user?.role}
                </p>
              </div>
            </Link>

            <div className="flex items-center gap-1">
              <Link
                href="/dashboard/about"
                onClick={() => setIsOpen(false)}
                aria-label={t("about")}
                title={t("about")}
                className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-9 w-9 items-center justify-center rounded-md transition-colors"
              >
                <Info className="h-5 w-5" />
              </Link>
              <Link
                href="/dashboard/settings"
                onClick={() => setIsOpen(false)}
                aria-label={t("settings")}
                title={t("settings")}
                className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-9 w-9 items-center justify-center rounded-md transition-colors"
              >
                <Settings className="h-5 w-5" />
              </Link>
              <LogoutButton />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
