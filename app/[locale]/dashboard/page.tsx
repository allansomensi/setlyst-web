import { staticTitle } from "@/lib/page-metadata";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import {
  ListMusic,
  Music,
  Disc3,
  Users,
  Guitar,
  Calendar,
  BarChart3,
  ChevronRight,
  Route,
} from "lucide-react";
import { Link } from "@/components/nav-link";
import { getDashboardMetrics } from "./actions";
import { UserMetricsCharts } from "./_components/user-metrics";
import { AdminMetricsCharts } from "./_components/admin-metrics";
import { PinnedItems } from "./_components/pins/pinned-items";
import { fetchServerApi } from "@/lib/api-server";
import type { PinnedItem } from "@/types/content";

export async function generateMetadata() {
  return staticTitle("dashboard");
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("dashboard");
  const tNav = await getTranslations("nav");
  const tTours = await getTranslations("tours");

  const userRole = session?.user?.role;

  const [metrics, pins] = await Promise.all([
    getDashboardMetrics(),
    fetchServerApi<PinnedItem[]>("/users/me/pins").catch(() => null),
  ]);

  const quickLinks = [
    {
      href: "/dashboard/analytics",
      icon: BarChart3,
      label: tNav("analytics"),
      description: t("analytics.description"),
    },
    {
      href: "/dashboard/artists",
      icon: Disc3,
      label: tNav("artists"),
      description: t("artists.description"),
    },
    {
      href: "/dashboard/songs",
      icon: Music,
      label: tNav("songs"),
      description: t("songs.description"),
    },
    {
      href: "/dashboard/setlists",
      icon: ListMusic,
      label: tNav("setlists"),
      description: t("setlists.description"),
    },
    {
      href: "/dashboard/gigs",
      icon: Calendar,
      label: tNav("gigs"),
      description: t("gigs.description"),
    },
    {
      href: "/dashboard/tours",
      icon: Route,
      label: tTours("title"),
      description: t("tours.description"),
    },
    {
      href: "/dashboard/bands",
      icon: Guitar,
      label: tNav("bands"),
      description: t("bands.description"),
    },
  ];

  if (userRole === "admin" || userRole === "moderator") {
    quickLinks.push({
      href: "/dashboard/users",
      icon: Users,
      label: tNav("users"),
      description: t("users.description"),
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("welcome", { name: session?.user?.name ?? "" })}
        </p>
      </div>

      {pins && <PinnedItems initial={pins} />}

      <section className="space-y-3">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          {t("shortcuts")}
        </h2>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
          {quickLinks.map(({ href, icon: Icon, label, description }) => (
            <Link
              key={href}
              href={href}
              className="group bg-card hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-ring/50 flex items-center gap-3 rounded-xl border p-3 transition-colors outline-none focus-visible:ring-3"
            >
              <span className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {label}
                </span>
                {/* Phones get a compact two-column grid of names only. */}
                <span className="text-muted-foreground hidden truncate text-xs sm:block">
                  {description}
                </span>
              </span>
              <ChevronRight className="text-muted-foreground/60 group-hover:text-foreground hidden h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 sm:block" />
            </Link>
          ))}
        </div>
      </section>

      {metrics && metrics.scope === "admin" && (
        <AdminMetricsCharts data={metrics} />
      )}

      {metrics && metrics.scope === "user" && (
        <UserMetricsCharts data={metrics} />
      )}
    </div>
  );
}
