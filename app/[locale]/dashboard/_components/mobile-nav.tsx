"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { ListMusic, Menu, X, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarLinks } from "./sidebar-links";
import { LogoutButton } from "./logout-button";
import { User } from "@/types/api";
import packageJson from "@/package.json";

export function MobileNav({
  user,
}: {
  user?: { name?: string | null; role?: User["role"] | null };
}) {
  const [isOpen, setIsOpen] = useState(false);

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
        <span className="bg-muted/40 text-muted-foreground rounded-full border px-2 py-0.5 text-[10px] font-medium shadow-sm select-none">
          v{packageJson.version}
        </span>
      </div>

      <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)}>
        <Menu className="h-6 w-6" />
      </Button>

      {isOpen && (
        <div className="bg-background animate-in slide-in-from-right fixed inset-0 z-50 flex flex-col duration-300">
          <div className="flex h-16 items-center justify-between border-b px-4">
            <span className="text-xl font-bold">Menu</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
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
                href="/dashboard/settings"
                onClick={() => setIsOpen(false)}
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
