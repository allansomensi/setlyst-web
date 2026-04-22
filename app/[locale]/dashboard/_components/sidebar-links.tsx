"use client";

import { Link, usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Disc3, Home, Music, ListMusic, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarLinksProps {
  isCollapsed?: boolean;
  userRole?: "user" | "moderator" | "admin";
}

export function SidebarLinks({ isCollapsed, userRole }: SidebarLinksProps) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const navLinks = [
    { name: t("home"), href: "/dashboard", icon: Home },
    { name: t("artists"), href: "/dashboard/artists", icon: Disc3 },
    { name: t("songs"), href: "/dashboard/songs", icon: Music },
    { name: t("setlists"), href: "/dashboard/setlists", icon: ListMusic },
  ];

  if (userRole === "admin" || userRole === "moderator") {
    navLinks.push({ name: t("users"), href: "/dashboard/users", icon: Users });
  }

  return (
    <nav className="flex-1 space-y-2 p-4">
      {navLinks.map((link) => {
        const Icon = link.icon;

        const isActive =
          link.href === "/dashboard"
            ? pathname === "/dashboard"
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
