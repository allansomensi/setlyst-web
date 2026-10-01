"use client";

import { useEffect, useState } from "react";
import { Link } from "@/components/nav-link";
import { usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import {
  BadgePercent,
  BarChart3,
  Calendar,
  CreditCard,
  Disc3,
  Flag,
  Gauge,
  Guitar,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  Activity,
  SlidersHorizontal,
  Landmark,
  Home,
  Link2,
  ListMusic,
  Megaphone,
  Music,
  Route,
  ScrollText,
  Shield,
  Sparkles,
  TicketPercent,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_TEXT_STYLES } from "@/components/role-badge";
import {
  getModerationOpenCount,
  getSupportOpenCount,
} from "@/lib/actions/staff";
import { MODERATION_CHANGED_EVENT } from "@/lib/moderation";
import {
  hasStaffCapability,
  isStaffRole,
  type StaffCapability,
} from "@/lib/staff-permissions";
import type { UserRole } from "@/types/api";

interface NavItem {
  key: string;
  href: string;
  icon: LucideIcon;
  /** Label namespace when it isn't `nav` (content pages own theirs). */
  ns?: "tours" | "trash";
  /** Active only on `href` itself, not on the pages below it. */
  exact?: boolean;
}

interface StaffNavItem extends NavItem {
  /** Needed to see the entry at all (see lib/staff-permissions.ts). */
  capability: StaffCapability;
  /**
   * Shows a count next to the label: open moderation flags, or support
   * requests waiting for the staff.
   */
  badge?: StaffBadge;
}

type StaffBadge = "moderation" | "support";

interface StaffNavGroup {
  key: string;
  items: StaffNavItem[];
}

const MAIN_LINKS: NavItem[] = [
  { key: "home", href: "/dashboard", icon: Home },
  { key: "analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { key: "artists", href: "/dashboard/artists", icon: Disc3 },
  { key: "songs", href: "/dashboard/songs", icon: Music },
  { key: "setlists", href: "/dashboard/setlists", icon: ListMusic },
  { key: "gigs", href: "/dashboard/gigs", icon: Calendar },
  { key: "navLabel", href: "/dashboard/tours", icon: Route, ns: "tours" },
  { key: "bands", href: "/dashboard/bands", icon: Guitar },
  { key: "navLabel", href: "/dashboard/trash", icon: Trash2, ns: "trash" },
];

export const STAFF_NAV: StaffNavGroup[] = [
  {
    key: "console",
    items: [
      {
        key: "overview",
        href: "/dashboard/admin",
        icon: LayoutDashboard,
        capability: "console",
        exact: true,
      },
      {
        key: "support",
        href: "/dashboard/admin/support",
        icon: LifeBuoy,
        capability: "support",
        badge: "support",
      },
    ],
  },
  {
    key: "people",
    items: [
      {
        key: "users",
        href: "/dashboard/users",
        icon: Users,
        capability: "users",
      },
      {
        key: "moderation",
        href: "/dashboard/admin/moderation",
        icon: Flag,
        capability: "moderation",
        badge: "moderation",
      },
      {
        key: "audit",
        href: "/dashboard/admin/audit",
        icon: ScrollText,
        capability: "audit",
      },
    ],
  },
  {
    key: "communication",
    items: [
      {
        key: "announcements",
        href: "/dashboard/admin/announcements",
        icon: Megaphone,
        capability: "announcements",
      },
      {
        key: "releaseNotes",
        href: "/dashboard/admin/release-notes",
        icon: Sparkles,
        capability: "releaseNotes",
      },
    ],
  },
  {
    key: "subscriptions",
    items: [
      {
        key: "billing",
        href: "/dashboard/admin/billing",
        icon: CreditCard,
        capability: "billing",
      },
      {
        key: "finance",
        href: "/dashboard/admin/finance",
        icon: Landmark,
        capability: "finance",
      },
      {
        key: "promoCodes",
        href: "/dashboard/admin/promo-codes",
        icon: TicketPercent,
        capability: "promoCodes",
      },
      {
        key: "promotions",
        href: "/dashboard/admin/promotions",
        icon: BadgePercent,
        capability: "promotions",
      },
    ],
  },
  {
    key: "content",
    items: [
      {
        key: "bands",
        href: "/dashboard/admin/bands",
        icon: Guitar,
        capability: "content",
      },
      {
        key: "songs",
        href: "/dashboard/admin/songs",
        icon: Music,
        capability: "content",
      },
      {
        key: "setlists",
        href: "/dashboard/admin/setlists",
        icon: ListMusic,
        capability: "content",
      },
      {
        key: "links",
        href: "/dashboard/admin/links",
        icon: Link2,
        capability: "content",
      },
    ],
  },
  {
    key: "platform",
    items: [
      {
        key: "platform",
        href: "/dashboard/admin/platform",
        icon: SlidersHorizontal,
        capability: "platform",
      },
      {
        key: "incidents",
        href: "/dashboard/admin/incidents",
        icon: Activity,
        capability: "incidents",
      },
      {
        key: "emails",
        href: "/dashboard/admin/emails",
        icon: Mail,
        capability: "emails",
      },
      {
        key: "limits",
        href: "/dashboard/admin/limits",
        icon: Gauge,
        capability: "limits",
      },
    ],
  },
];

interface SidebarLinksProps {
  isCollapsed?: boolean;
  userRole?: UserRole;
}

export function isActive(pathname: string, href: string, exact = false) {
  return href === "/dashboard" || exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

/** Navigations within this long of the last count reuse it. */
const STAFF_COUNT_TTL_MS = 60_000;

const STAFF_COUNT_LOADERS: Record<StaffBadge, () => Promise<number | null>> = {
  moderation: getModerationOpenCount,
  support: getSupportOpenCount,
};

/**
 * The last count fetched per badge, shared by every mounted link list
 * (the sidebar and the mobile menu both render one).
 */
const staffCountCache: Partial<
  Record<StaffBadge, { at: number; value: Promise<number | null> }>
> = {};

function loadStaffCount(
  badge: StaffBadge,
  force: boolean,
): Promise<number | null> {
  const now = Date.now();
  const cached = staffCountCache[badge];
  if (force || !cached || now - cached.at > STAFF_COUNT_TTL_MS) {
    staffCountCache[badge] = {
      at: now,
      value: STAFF_COUNT_LOADERS[badge](),
    };
  }
  return staffCountCache[badge]!.value;
}

/**
 * A staff badge's count (staff only), refreshed on navigation (at most
 * once a minute) and, for moderation, whenever the queue reports a
 * change.
 */
function useStaffCount(badge: StaffBadge, enabled: boolean): number | null {
  const pathname = usePathname();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = (force: boolean) => {
      loadStaffCount(badge, force)
        .then((value) => {
          if (!cancelled) setCount(value);
        })
        .catch(() => {
          delete staffCountCache[badge];
        });
    };
    const onChanged = () => load(true);
    load(false);
    if (badge === "moderation") {
      window.addEventListener(MODERATION_CHANGED_EVENT, onChanged);
    }
    return () => {
      cancelled = true;
      window.removeEventListener(MODERATION_CHANGED_EVENT, onChanged);
    };
  }, [badge, enabled, pathname]);

  return enabled ? count : null;
}

export function SidebarLinks({ isCollapsed, userRole }: SidebarLinksProps) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const tStaff = useTranslations("staff.nav");
  const isStaff = isStaffRole(userRole);
  const moderationCount = useStaffCount(
    "moderation",
    isStaff && hasStaffCapability(userRole, "moderation"),
  );
  const supportCount = useStaffCount(
    "support",
    isStaff && hasStaffCapability(userRole, "support"),
  );
  const tTours = useTranslations("tours");
  const tTrash = useTranslations("trash");

  const renderLink = (
    link: NavItem,
    label: string,
    badge: number | null = null,
    badgeKind: StaffBadge = "moderation",
  ) => {
    const Icon = link.icon;
    const active = isActive(pathname, link.href, link.exact);
    const badgeLabel =
      badge !== null && badge > 0
        ? tStaff(badgeKind === "support" ? "openRequests" : "openFlags", {
            count: badge,
          })
        : null;

    return (
      <Link
        key={link.href}
        href={link.href}
        title={
          isCollapsed
            ? badgeLabel
              ? `${label} · ${badgeLabel}`
              : label
            : undefined
        }
        // Collapsed, the label isn't rendered: name the icon-only link.
        aria-label={
          isCollapsed
            ? badgeLabel
              ? `${label} · ${badgeLabel}`
              : label
            : undefined
        }
        aria-current={active ? "page" : undefined}
        className={cn(
          "focus-visible:ring-ring/50 relative flex items-center rounded-md px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-3",
          isCollapsed ? "justify-center" : "gap-3",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
        )}
      >
        <Icon className="h-5 w-5 shrink-0" aria-hidden />
        {!isCollapsed && (
          <span className="min-w-0 flex-1 truncate">{label}</span>
        )}
        {badgeLabel &&
          (isCollapsed ? (
            <span className="bg-destructive ring-sidebar absolute top-1.5 right-3 h-2 w-2 rounded-full ring-2">
              <span className="sr-only">{badgeLabel}</span>
            </span>
          ) : (
            <span
              className="bg-destructive/15 text-destructive ml-auto rounded-full px-1.5 py-px text-[11px] font-semibold tabular-nums"
              aria-label={badgeLabel}
            >
              {badge! > 99 ? "99+" : badge}
            </span>
          ))}
      </Link>
    );
  };

  const groups = isStaff
    ? STAFF_NAV.map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          hasStaffCapability(userRole, item.capability),
        ),
      })).filter((group) => group.items.length > 0)
    : [];

  return (
    <nav
      className="flex-1 space-y-1 overflow-y-auto p-4"
      aria-label={t("menu")}
    >
      {MAIN_LINKS.map((link) =>
        renderLink(
          link,
          link.ns === "tours"
            ? tTours(link.key)
            : link.ns === "trash"
              ? tTrash(link.key)
              : t(link.key),
        ),
      )}

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
              <Shield className="h-3.5 w-3.5" aria-hidden />
              {t("staffSection")}
            </p>
          )}
          <div className="space-y-3">
            {groups.map((group) => (
              <div
                key={group.key}
                role="group"
                aria-label={tStaff(`groups.${group.key}`)}
                className="space-y-1"
              >
                {isCollapsed ? (
                  <div className="bg-border/60 mx-auto h-px w-4" aria-hidden />
                ) : (
                  <p className="text-muted-foreground/80 px-3 pt-1 text-[11px] font-medium">
                    {tStaff(`groups.${group.key}`)}
                  </p>
                )}
                {group.items.map((item) =>
                  renderLink(
                    item,
                    tStaff(`items.${item.key}`),
                    item.badge === "moderation"
                      ? moderationCount
                      : item.badge === "support"
                        ? supportCount
                        : null,
                    item.badge,
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
