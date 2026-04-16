"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Disc3, Home, Music, ListMusic } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Artists", href: "/dashboard/artists", icon: Disc3 },
  { name: "Songs", href: "/dashboard/songs", icon: Music },
  { name: "Setlists", href: "/dashboard/setlists", icon: ListMusic },
];

export function SidebarLinks({ isCollapsed }: { isCollapsed?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-2 p-4">
      {navLinks.map((link) => {
        const Icon = link.icon;

        const isActive =
          link.href === "/dashboard"
            ? pathname === link.href
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            title={isCollapsed ? link.name : undefined}
            className={cn(
              "flex items-center rounded-md px-3 py-2 transition-colors",
              isCollapsed ? "justify-center" : "gap-3",
              isActive
                ? "bg-muted text-foreground font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!isCollapsed && <span className="truncate">{link.name}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
