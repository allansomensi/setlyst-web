import type { Metadata } from "next";
import NextLink from "next/link";
import { createTranslator } from "next-intl";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Database,
  Server,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { AppLogo } from "@/components/app-logo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolvePublicLocale } from "@/components/public/resolve-public-locale";
import { parseApiTimestamp } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { ApiStatus, ServiceHealth } from "@/types/api";
import { AutoRefresh } from "./_components/auto-refresh";
import { RefreshStatusButton } from "./_components/refresh-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Status",
  robots: { index: true, follow: false },
};

const REFRESH_SECONDS = 60;

async function fetchSystemStatus(): Promise<ApiStatus | null> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
    const res = await fetch(`${baseUrl}/status`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    // A 503 still carries the report (which dependency is down).
    if (!res.ok && res.status !== 503) return null;
    return (await res.json()) as ApiStatus;
  } catch (error) {
    console.error("Failed to fetch API status:", error);
    return null;
  }
}

const HEALTH_STYLES: Record<
  ServiceHealth,
  { icon: LucideIcon; badge: string; banner: string }
> = {
  operational: {
    icon: CheckCircle2,
    badge:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    banner:
      "border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
  },
  degraded: {
    icon: AlertTriangle,
    badge:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    banner:
      "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300",
  },
  down: {
    icon: XCircle,
    badge: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
    banner: "border-red-500/40 bg-red-500/5 text-red-700 dark:text-red-300",
  },
};

function formatUptime(seconds: number, locale: string): string {
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  const parts: string[] = [];
  let rest = Math.max(0, Math.floor(seconds));
  for (const [unit, size] of units) {
    const value = Math.floor(rest / size);
    rest %= size;
    if (value > 0 || (unit === "minute" && parts.length === 0)) {
      parts.push(
        new Intl.NumberFormat(locale, {
          style: "unit",
          unit,
          unitDisplay: "short",
        }).format(value),
      );
    }
    if (parts.length === 2) break;
  }
  return parts.join(" ");
}

export default async function StatusPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string | string[] }>;
}) {
  const { lang } = await searchParams;
  const { locale, messages } = await resolvePublicLocale(lang);
  // Messages are loaded at runtime (this page is outside `[locale]`), so
  // the translator can't be typed against them.
  const t = createTranslator({
    locale,
    messages,
    namespace: "status",
  }) as unknown as (
    key: string,
    values?: Record<string, string | number>,
  ) => string;

  const status = await fetchSystemStatus();
  const overall: ServiceHealth = status?.status ?? "down";
  const apiHealth: ServiceHealth = status ? "operational" : "down";
  const database = status?.dependencies.database;
  const dbHealth: ServiceHealth = database?.status ?? "down";
  const OverallIcon = HEALTH_STYLES[overall].icon;
  const checkedAt = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(status ? parseApiTimestamp(status.updated_at) : new Date());

  const poolUsage =
    database && database.max_connections
      ? Math.min(
          100,
          Math.round(
            ((database.opened_connections ?? 0) / database.max_connections) *
              100,
          ),
        )
      : null;

  const services = [
    {
      key: "api",
      icon: Server,
      name: t("services.api"),
      health: apiHealth,
      details: status
        ? [
            t("details.version", { version: status.version }),
            t("details.uptime", {
              uptime: formatUptime(status.uptime_seconds, locale),
            }),
          ]
        : [t("details.unreachable")],
    },
    {
      key: "database",
      icon: Database,
      name: t("services.database"),
      health: dbHealth,
      details: database
        ? [
            database.latency_ms != null
              ? t("details.latency", { ms: database.latency_ms })
              : t("details.noLatency"),
            database.version
              ? database.version.split(" ").slice(0, 2).join(" ")
              : null,
          ].filter((line): line is string => Boolean(line))
        : [t("details.unknown")],
    },
  ];

  return (
    <div className="bg-muted/30 min-h-dvh px-4 py-10 sm:py-14">
      <AutoRefresh seconds={REFRESH_SECONDS} />
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <NextLink href="/" className="flex items-center gap-2 font-semibold">
            <AppLogo size={32} className="rounded-lg" />
            Setlyst
          </NextLink>
          <RefreshStatusButton
            label={t("refresh")}
            pendingLabel={t("refreshing")}
          />
        </header>

        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>

        <div
          className={cn(
            "flex items-center gap-3 rounded-xl border px-5 py-4",
            HEALTH_STYLES[overall].banner,
          )}
          role="status"
        >
          <OverallIcon className="h-6 w-6 shrink-0" />
          <div>
            <p className="font-semibold">{t(`overall.${overall}`)}</p>
            <p className="text-sm opacity-80">{t(`overallHint.${overall}`)}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("servicesTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {services.map((service) => (
              <div
                key={service.key}
                className="flex items-center justify-between gap-4 px-6 py-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="bg-muted rounded-lg p-2">
                    <service.icon className="text-muted-foreground h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">{service.name}</p>
                    <p className="text-muted-foreground truncate text-sm">
                      {service.details.join(" · ")}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={HEALTH_STYLES[service.health].badge}
                >
                  {t(`health.${service.health}`)}
                </Badge>
              </div>
            ))}
            {database && poolUsage !== null && (
              <div className="space-y-1.5 px-6 py-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("connections")}
                  </span>
                  <span className="font-mono tabular-nums">
                    {database.opened_connections ?? 0} /{" "}
                    {database.max_connections}
                  </span>
                </div>
                <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      poolUsage > 85
                        ? "bg-red-500"
                        : poolUsage > 60
                          ? "bg-amber-500"
                          : "bg-emerald-500",
                    )}
                    style={{ width: `${Math.max(poolUsage, 2)}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <footer className="text-muted-foreground flex flex-col items-center gap-2 text-center text-xs">
          <p>{t("checkedAt", { date: checkedAt, seconds: REFRESH_SECONDS })}</p>
          <NextLink
            href={`/${locale}/dashboard`}
            className="hover:text-foreground flex items-center gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("backToApp")}
          </NextLink>
        </footer>
      </div>
    </div>
  );
}
