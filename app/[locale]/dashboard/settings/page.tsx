import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Gauge, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { QuotaUsageList } from "@/components/quota-usage-list";
import { Link } from "@/i18n/routing";
import { fetchServerApi } from "@/lib/api-server";
import { getMyPreferences } from "@/lib/server-data";
import type { QuotaReport } from "@/types/api";
import { BackupSection } from "./_components/backup-section";
import { DisplayDefaultsSection } from "./_components/display-defaults-section";
import { HelpSection } from "./_components/help-section";
import { OfflineSection } from "./_components/offline-section";
import { PdfDefaultsSection } from "./_components/pdf-defaults-section";
import { SettingsForm } from "./_components/settings-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return { title: t("title") };
}

const SECTIONS = [
  "general",
  "display",
  "pdf",
  "usage",
  "security",
  "offline",
  "backup",
  "help",
] as const;

export default async function SettingsPage() {
  const t = await getTranslations("settings");
  const [preferences, usage] = await Promise.all([
    getMyPreferences(),
    fetchServerApi<QuotaReport>("/users/me/quotas").catch(() => null),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <div className="space-y-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <nav aria-label={t("sectionsNav")} className="flex flex-wrap gap-1.5">
          {SECTIONS.map((section) => (
            <a
              key={section}
              href={`#${section}`}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/70 rounded-full px-3 py-1 text-xs font-medium transition-colors"
            >
              {t(`sections.${section}`)}
            </a>
          ))}
        </nav>
      </div>

      <div id="general" className="scroll-mt-20">
        <SettingsForm initialPreferences={preferences} />
      </div>

      <div className="scroll-mt-20">
        <DisplayDefaultsSection />
      </div>

      <div className="scroll-mt-20">
        <PdfDefaultsSection />
      </div>

      <Card id="usage" className="scroll-mt-20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="text-primary h-4 w-4" />
            {t("usage.title")}
          </CardTitle>
          <CardDescription>{t("usage.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {usage ? (
            <QuotaUsageList report={usage} />
          ) : (
            <p className="text-muted-foreground text-sm">
              {t("usage.unavailable")}
            </p>
          )}
        </CardContent>
      </Card>

      <Card id="security" className="scroll-mt-20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="text-primary h-4 w-4" />
            {t("security.title")}
          </CardTitle>
          <CardDescription>{t("security.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/dashboard/profile#password">
              {t("security.changePassword")}
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div id="offline" className="scroll-mt-20">
        <OfflineSection />
      </div>

      <div id="backup" className="scroll-mt-20">
        <BackupSection />
      </div>

      <div className="scroll-mt-20">
        <HelpSection />
      </div>
    </div>
  );
}
