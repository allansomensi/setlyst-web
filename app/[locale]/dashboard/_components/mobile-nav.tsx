"use client";

import { useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
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
import { TrialStatus } from "./trial/trial-status";
import type { AccountPlanStatus } from "@/lib/trial";
import packageJson from "@/package.json";

/**
 * Horizontal safe-area padding: in landscape on a notched phone the
 * installed app draws under the notch on one side.
 */
const SAFE_X =
  "pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))]";

export function MobileNav({
  user,
  planStatus = null,
}: {
  user?: SidebarUser;
  planStatus?: AccountPlanStatus | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("nav");
  const tRoles = useTranslations("roles");
  const role = user?.role ?? "user";
  const close = () => setIsOpen(false);

  return (
    // `pt` for the status bar / notch: the installed iOS app draws under
    // it (black-translucent status bar + viewport-fit=cover), and the menu
    // button used to sit right where iOS keeps taps for scroll-to-top.
    <header
      className={cn(
        "bg-sidebar text-sidebar-foreground border-sidebar-border shrink-0 border-b pt-[env(safe-area-inset-top)] md:hidden",
        SAFE_X,
      )}
    >
      <div className="flex h-16 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xl font-bold"
          >
            <AppLogo size={28} priority className="rounded-md" />
            <span>Setlyst</span>
          </Link>
          {/* No room for it next to everything else on a 360px phone; it
              is in the menu's footer instead. */}
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
          <div className="hidden sm:block">
            <WhatsNewLink />
          </div>
          <NotificationBellErrorBoundary>
            <NotificationBell />
          </NotificationBellErrorBoundary>

          <DialogPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
            <DialogPrimitive.Trigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                aria-label={t("openMenu")}
              >
                <Menu className="h-6 w-6" aria-hidden />
              </Button>
            </DialogPrimitive.Trigger>
            <DialogPrimitive.Portal>
              {/* A real modal (Radix): focus moves in and is trapped,
                  Escape closes, the page behind can't scroll, and focus
                  returns to the menu button afterwards. */}
              <DialogPrimitive.Content
                aria-describedby={undefined}
                className={cn(
                  "bg-background fixed inset-0 z-50 flex flex-col outline-none",
                  "data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right duration-200 motion-reduce:animate-none",
                  "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
                )}
              >
                <div
                  className={cn(
                    "flex h-16 shrink-0 items-center justify-between border-b",
                    SAFE_X,
                  )}
                >
                  <DialogPrimitive.Title className="text-xl font-bold">
                    {t("menu")}
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Close asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10"
                      aria-label={t("closeMenu")}
                    >
                      <X className="h-6 w-6" aria-hidden />
                    </Button>
                  </DialogPrimitive.Close>
                </div>

                <nav
                  aria-label={t("menu")}
                  className="flex-1 overflow-y-auto overscroll-contain py-2"
                  onClick={(event) => {
                    // Any link followed from the list closes the menu.
                    if ((event.target as Element).closest("a[href]")) close();
                  }}
                >
                  <SidebarLinks isCollapsed={false} userRole={role} />
                </nav>

                {planStatus && (
                  <div className={cn("border-t pt-3", SAFE_X)}>
                    <TrialStatus status={planStatus} onNavigate={close} />
                  </div>
                )}

                <div
                  className={cn(
                    "flex items-center justify-between gap-2 border-t py-4",
                    SAFE_X,
                  )}
                >
                  <Link
                    href="/dashboard/profile"
                    className="min-w-0 flex-1 overflow-hidden pr-2"
                    onClick={close}
                  >
                    <p className="truncate text-sm font-medium">{user?.name}</p>
                    <p
                      className={cn("truncate text-xs", ROLE_TEXT_STYLES[role])}
                    >
                      {tRoles(role)}
                      <span className="text-muted-foreground font-mono">
                        {" · "}v{packageJson.version}
                      </span>
                    </p>
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
        </div>
      </div>
    </header>
  );
}
