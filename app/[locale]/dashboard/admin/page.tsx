import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import {
  Activity,
  CircleCheck,
  Construction,
  Flag,
  Landmark,
  LifeBuoy,
  Mail,
  MailWarning,
  MailX,
  Megaphone,
  ScrollText,
  ShieldAlert,
  Siren,
  SlidersHorizontal,
  UserX,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClientDate } from "@/components/client-date";
import { Link } from "@/components/nav-link";
import { LoadErrorNotice } from "@/components/load-error-notice";
import { AdminPageHeader } from "@/components/staff/admin-page-header";
import { Kpi, KpiGrid } from "@/components/staff/kpi-grid";
import { fetchServerApi } from "@/lib/api-server";
import {
  attentionItems,
  oldestPendingMinutes,
  type AttentionItem,
  type AttentionKey,
} from "@/lib/console";
import { requireStaffPage } from "@/lib/staff-guard";
import type { StaffCapability } from "@/lib/staff-permissions";
import { cn } from "@/lib/utils";
import type { ConsoleOverview } from "@/types/operations";
import { ConsoleSearchForm } from "./_components/console-search-form";
import { LazySignupsChart } from "./_components/lazy-signups-chart";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("console");
  return { title: t("title") };
}

const ATTENTION_ICONS: Record<AttentionKey, LucideIcon> = {
  maintenance: Construction,
  incidents: Activity,
  supportUrgent: Siren,
  emailsFailed: MailX,
  supportOpen: LifeBuoy,
  moderation: Flag,
  emailBacklog: MailWarning,
  registrationsClosed: UserX,
  staffTwoFactor: ShieldAlert,
};

/**
 * Where each item leads. An unlabelled first link is the card's own (its
 * title); labelled ones are listed under it.
 */
const ATTENTION_LINKS: Record<
  AttentionKey,
  { href: string; label?: "unassigned" | "moderators" | "admins" }[]
> = {
  maintenance: [{ href: "/dashboard/admin/platform" }],
  incidents: [{ href: "/dashboard/admin/incidents" }],
  supportUrgent: [{ href: "/dashboard/admin/support?priority=urgent" }],
  emailsFailed: [{ href: "/dashboard/admin/emails?status=failed" }],
  // The counts are of open requests (waiting for staff), not of the
  // inbox's default tab (open and pending).
  supportOpen: [
    { href: "/dashboard/admin/support?status=open" },
    {
      href: "/dashboard/admin/support?status=open&assignee=none",
      label: "unassigned",
    },
  ],
  moderation: [{ href: "/dashboard/admin/moderation" }],
  emailBacklog: [{ href: "/dashboard/admin/emails?status=pending" }],
  registrationsClosed: [{ href: "/dashboard/admin/platform" }],
  staffTwoFactor: [
    {
      href: "/dashboard/users?role=moderator&two_factor=false",
      label: "moderators",
    },
    { href: "/dashboard/users?role=admin&two_factor=false", label: "admins" },
  ],
};

/** The console's sections, as on the sidebar (lib/staff-permissions.ts). */
const SECTIONS: {
  key: string;
  href: string;
  icon: LucideIcon;
  capability: StaffCapability;
}[] = [
  {
    key: "support",
    href: "/dashboard/admin/support",
    icon: LifeBuoy,
    capability: "support",
  },
  { key: "users", href: "/dashboard/users", icon: Users, capability: "users" },
  {
    key: "moderation",
    href: "/dashboard/admin/moderation",
    icon: Flag,
    capability: "moderation",
  },
  {
    key: "audit",
    href: "/dashboard/admin/audit",
    icon: ScrollText,
    capability: "audit",
  },
  {
    key: "announcements",
    href: "/dashboard/admin/announcements",
    icon: Megaphone,
    capability: "announcements",
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
    key: "platform",
    href: "/dashboard/admin/platform",
    icon: SlidersHorizontal,
    capability: "platform",
  },
  {
    key: "finance",
    href: "/dashboard/admin/finance",
    icon: Landmark,
    capability: "finance",
  },
];

export default async function ConsoleOverviewPage() {
  const { can } = await requireStaffPage("console");
  const t = await getTranslations("console");
  const tNav = await getTranslations("staff.nav.items");
  const locale = await getLocale();

  const overview = await fetchServerApi<ConsoleOverview>(
    "/admin/overview",
  ).catch(() => null);

  const header = (
    <AdminPageHeader title={t("title")} description={t("description")}>
      {overview && (
        <p className="text-muted-foreground text-xs">
          {t("updatedAt")}{" "}
          <ClientDate
            value={overview.generated_at}
            options={{ timeStyle: "short" }}
          />
        </p>
      )}
    </AdminPageHeader>
  );
  const search = <ConsoleSearchForm className="max-w-2xl" />;

  const sections = (
    <section aria-labelledby="console-sections" className="space-y-3">
      <h2 id="console-sections" className="text-lg font-semibold">
        {t("sections")}
      </h2>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {SECTIONS.filter((section) => can(section.capability)).map(
          ({ key, href, icon: Icon }) => (
            <li key={key}>
              <Link
                href={href}
                className="bg-card hover:bg-muted focus-visible:ring-ring/50 flex h-full items-center gap-2.5 rounded-xl border p-3 text-sm font-medium shadow-(--shadow-surface) transition-colors outline-none focus-visible:ring-3"
              >
                <Icon
                  className="text-muted-foreground size-4 shrink-0"
                  aria-hidden
                />
                <span className="min-w-0">{tNav(key)}</span>
              </Link>
            </li>
          ),
        )}
      </ul>
    </section>
  );

  if (!overview) {
    return (
      <>
        {header}
        {search}
        <LoadErrorNotice />
        {sections}
      </>
    );
  }

  const number = new Intl.NumberFormat(locale);
  const { users } = overview;
  const items = attentionItems(overview);
  const signupsTotal = overview.signups.reduce((sum, d) => sum + d.count, 0);

  const describe = (item: AttentionItem) => {
    switch (item.key) {
      case "maintenance":
        return {
          title: t(`attention.maintenance.${overview.maintenance_mode}`),
          description: t(
            `attention.maintenance.${overview.maintenance_mode}Hint`,
          ),
        };
      case "supportOpen":
        return {
          title: t("attention.supportOpen", { count: item.count }),
          description:
            overview.support_unassigned > 0
              ? t("attention.supportUnassigned", {
                  count: overview.support_unassigned,
                })
              : t("attention.supportAssigned"),
        };
      case "emailBacklog": {
        const minutes = oldestPendingMinutes(overview);
        return {
          title: t("attention.emailBacklog", { count: item.count }),
          description:
            minutes === null
              ? undefined
              : minutes >= 120
                ? t("attention.oldestHours", {
                    hours: Math.floor(minutes / 60),
                  })
                : t("attention.oldestMinutes", { minutes }),
        };
      }
      default:
        return {
          title: t(`attention.${item.key}`, { count: item.count }),
          description: t(`attention.${item.key}Hint`),
        };
    }
  };

  return (
    <>
      {header}
      {search}

      <section aria-labelledby="console-attention" className="space-y-3">
        <h2 id="console-attention" className="text-lg font-semibold">
          {t("attention.title")}
        </h2>
        {items.length === 0 ? (
          <div className="bg-card flex items-center gap-3 rounded-xl border p-4 shadow-(--shadow-surface)">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              <CircleCheck className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="font-medium">{t("attention.clear")}</p>
              <p className="text-muted-foreground text-sm">
                {t("attention.clearHint")}
              </p>
            </div>
          </div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {items.map((item) => {
              const Icon = ATTENTION_ICONS[item.key];
              const links = ATTENTION_LINKS[item.key];
              const [main] = links;
              const labelled = links.filter((link) => link.label);
              const { title, description } = describe(item);
              const critical = item.tone === "critical";
              return (
                <li
                  key={item.key}
                  className={cn(
                    "bg-card relative flex gap-3 rounded-xl border p-4 shadow-(--shadow-surface) transition-colors",
                    !main.label && "hover:bg-muted/50",
                    critical
                      ? "border-destructive/40"
                      : "border-amber-500/40 dark:border-amber-400/30",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full",
                      critical
                        ? "bg-destructive/10 text-destructive"
                        : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    {main.label ? (
                      <p className="font-medium">{title}</p>
                    ) : (
                      // The title is the card's link (its hit area covers
                      // the card); further links sit above it.
                      <Link
                        href={main.href}
                        className="focus-visible:ring-ring/50 block rounded-sm font-medium outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:ring-3"
                      >
                        {title}
                      </Link>
                    )}
                    {description && (
                      <p className="text-muted-foreground text-sm">
                        {description}
                      </p>
                    )}
                    {labelled.length > 0 && (
                      <p className="relative z-10 flex flex-wrap gap-x-4 gap-y-1 pt-1 text-sm">
                        {labelled.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            className="text-primary font-medium underline-offset-4 hover:underline"
                          >
                            {t(`attention.links.${link.label}`)}
                          </Link>
                        ))}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="console-accounts" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="console-accounts" className="text-lg font-semibold">
            {t("accounts.title")}
          </h2>
          <Link
            href="/dashboard/users"
            className="text-primary text-sm font-medium underline-offset-4 hover:underline"
          >
            {t("accounts.all")}
          </Link>
        </div>
        <KpiGrid className="lg:grid-cols-3">
          <Kpi
            label={t("accounts.total")}
            value={number.format(users.total)}
            hint={t("accounts.newToday", { count: users.new_today })}
          />
          <Kpi
            label={t("accounts.new7d")}
            value={number.format(users.new_7d)}
            hint={t("accounts.in30d", { count: users.new_30d })}
          />
          <Kpi
            label={t("accounts.active7d")}
            value={number.format(users.active_7d)}
            hint={t("accounts.in30d", { count: users.active_30d })}
          />
          <Kpi
            label={t("accounts.unverified")}
            value={number.format(users.unverified)}
          />
          <Kpi
            label={t("accounts.suspended")}
            value={number.format(users.banned)}
            tone={users.banned > 0 ? "text-destructive" : undefined}
          />
          <Kpi
            label={t("accounts.deactivated")}
            value={number.format(users.deactivated)}
          />
        </KpiGrid>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{t("chart.title")}</CardTitle>
          <CardDescription>
            {t("chart.total", { count: signupsTotal })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LazySignupsChart data={overview.signups} />
        </CardContent>
      </Card>

      {sections}
    </>
  );
}
