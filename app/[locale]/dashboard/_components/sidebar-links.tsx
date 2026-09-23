"use client";

import { Link } from "@/components/nav-link";
import { usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  Calendar,
  Disc3,
  Gauge,
  Guitar,
  Home,
  Link2,
  ListMusic,
  Music,
  ScrollText,
  Shield,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_TEXT_STYLES } from "@/components/role-badge";
import type { UserRole } from "@/types/api";

interface NavItem {
  key: string;
  href: string;
  icon: LucideIcon;
  /** Only rendered for admins (the rest of the staff section is for moderators too). */
  adminOnly?: boolean;
}

const MAIN_LINKS: NavItem[] = [
  { key: "home", href: "/dashboard", icon: Home },
  { key: "analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { key: "artists", href: "/dashboard/artists", icon: Disc3 },
  { key: "songs", href: "/dashboard/songs", icon: Music },
  { key: "setlists", href: "/dashboard/setlists", icon: ListMusic },
  { key: "gigs", href: "/dashboard/gigs", icon: Calendar },
  { key: "bands", href: "/dashboard/bands", icon: Guitar },
];

const STAFF_LINKS: NavItem[] = [
  { key: "adminUsers", href: "/dashboard/users", icon: Users },
  { key: "adminBands", href: "/dashboard/admin/bands", icon: Guitar },
  { key: "adminSongs", href: "/dashboard/admin/songs", icon: Music },
  { key: "adminSetlists", href: "/dashboard/admin/setlists", icon: ListMusic },
  { key: "adminLinks", href: "/dashboard/admin/links", icon: Link2 },
  { key: "adminAudit", href: "/dashboard/admin/audit", icon: ScrollText },
  { key: "adminLimits", href: "/dashboard/admin/limits", icon: Gauge },
];

interface SidebarLinksProps {
  isCollapsed?: boolean;
  userRole?: UserRole;
}

function isActive(pathname: string, href: string) {
  return href === "/dashboard"
    ? pathname === "/dashboard"
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarLinks({ isCollapsed, userRole }: SidebarLinksProps) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const isStaff = userRole === "admin" || userRole === "moderator";

  const renderLink = (link: NavItem) => {
    const Icon = link.icon;
    const active = isActive(pathname, link.href);
    const label = t(link.key);

    return (
      <Link
        key={link.href}
        href={link.href}
        title={isCollapsed ? label : undefined}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center rounded-md px-3 py-2 text-sm transition-colors",
          isCollapsed ? "justify-center" : "gap-3",
          active
            ? "bg-muted text-foreground font-medium"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!isCollapsed && <span className="truncate">{label}</span>}
      </Link>
    );
  };

  return (
    <nav
      className="flex-1 space-y-1 overflow-y-auto p-4"
      aria-label={t("menu")}
    >
      {MAIN_LINKS.map(renderLink)}

      {isStaff && userRole && (
        <div className="pt-4">
          {isCollapsed ? (
            <div className="bg-border mx-auto mb-2 h-px w-8" aria-hidden />
          ) : (
            <p
              className={cn(
                "mb-1 flex items-center gap-1.5 px-3 text-[11px] font-semibold tracking-wider uppercase",
                ROLE_TEXT_STYLES[userRole],
              )}
            >
              <Shield className="h-3.5 w-3.5" />
              {t("staffSection")}
            </p>
          )}
          <div className="space-y-1">
            {STAFF_LINKS.filter(
              (link) => !link.adminOnly || userRole === "admin",
            ).map(renderLink)}
          </div>
        </div>
      )}
    </nav>
  );
}
