"use client";

import { useState } from "react";
import { Link } from "@/components/nav-link";
import { Menu, Settings, X } from "lucide-react";
import { AppLogo } from "@/components/app-logo";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SidebarLinks } from "./sidebar-links";
import { NotificationBell } from "./notification-bell";
import { NotificationBellErrorBoundary } from "./notification-bell-error-boundary";
import { LogoutButton } from "./logout-button";
import { HelpMenu } from "./help-menu";
import { WhatsNewLink } from "./whats-new-link";
import { ROLE_TEXT_STYLES } from "@/components/role-badge";
import { cn } from "@/lib/utils";
import type { SidebarUser } from "./sidebar";
import packageJson from "@/package.json";

export function MobileNav({ user }: { user?: SidebarUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("nav");
  const tRoles = useTranslations("roles");
  const role = user?.role ?? "user";
  const close = () => setIsOpen(false);

  return (
    <div className="bg-sidebar text-sidebar-foreground border-sidebar-border flex h-16 shrink-0 items-center justify-between border-b px-4 md:hidden">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-xl font-bold"
        >
          <AppLogo size={28} priority className="rounded-md" />
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
        <WhatsNewLink />
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
        <div
          className="bg-background animate-in slide-in-from-right fixed inset-0 z-50 flex flex-col duration-300"
          role="dialog"
          aria-modal="true"
          aria-label={t("menu")}
        >
          <div className="flex h-16 items-center justify-between border-b px-4">
            <span className="text-xl font-bold">{t("menu")}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={close}
              aria-label={t("closeMenu")}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto py-2" onClick={close}>
            <SidebarLinks isCollapsed={false} userRole={role} />
          </div>

          <div className="flex items-center justify-between gap-2 border-t p-4">
            <Link
              href="/dashboard/profile"
              className="flex-1 overflow-hidden pr-2"
              onClick={close}
            >
              <p className="truncate text-sm font-medium">{user?.name}</p>
              <p className={cn("truncate text-xs", ROLE_TEXT_STYLES[role])}>
                {tRoles(role)}
              </p>
            </Link>

            <div className="flex items-center gap-1">
              <HelpMenu onNavigate={close} />
              <Link
                href="/dashboard/settings"
                onClick={close}
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
