"use client";

import { useState } from "react";
import Link from "next/link";
import { ListMusic, ChevronLeft, ChevronRight } from "lucide-react";
import { SidebarLinks } from "./sidebar-links";
import { LogoutButton } from "./logout-button";
import { cn } from "@/lib/utils";
import { User } from "@/types/api";

interface SidebarProps {
  user?: {
    name?: string | null;
    role?: User["role"] | null;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "bg-background relative hidden flex-col border-r transition-all duration-300 md:flex",
        isCollapsed ? "w-20" : "w-64",
      )}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
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
          isCollapsed ? "justify-center px-0" : "px-6",
        )}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-2 overflow-hidden text-xl font-bold"
        >
          <ListMusic className="h-6 w-6 shrink-0" />
          {!isCollapsed && <span className="truncate">Setlyst</span>}
        </Link>
      </div>

      <SidebarLinks
        isCollapsed={isCollapsed}
        userRole={user?.role as "user" | "moderator" | "admin" | undefined}
      />

      <div
        className={cn(
          "flex items-center border-t p-4 transition-all duration-300",
          isCollapsed ? "justify-center" : "justify-between",
        )}
      >
        {!isCollapsed && (
          <Link
            href="/dashboard/profile"
            className="group cursor-pointer overflow-hidden pr-2 transition-opacity hover:opacity-80"
          >
            <p className="group-hover:text-primary truncate text-sm font-medium transition-colors">
              {user?.name}
            </p>
            <p className="text-muted-foreground truncate text-xs capitalize">
              {user?.role}
            </p>
          </Link>
        )}
        <LogoutButton />
      </div>
    </aside>
  );
}
