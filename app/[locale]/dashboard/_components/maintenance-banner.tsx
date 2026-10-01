import { getTranslations } from "next-intl/server";
import { ArrowRight, Construction, ShieldAlert } from "lucide-react";
import { Link } from "@/components/nav-link";
import { MaintenanceDetails } from "@/components/maintenance/maintenance-details";
import { PLATFORM_SETTINGS_PATH } from "@/lib/maintenance";
import type { MaintenanceSettings } from "@/types/operations";

/**
 * The dashboard's maintenance banners (mounted by the layout, never
 * dismissible: they last as long as the maintenance does).
 *
 * - `readOnly`: everyone else, while read-only maintenance pauses every
 *   change (the API refuses them with MAINTENANCE_MODE);
 * - `staff`: a reminder for staff, who are never affected, that the
 *   platform is in maintenance for everyone else, with the way out.
 *
 * Full maintenance doesn't get a banner: people other than staff see
 * the maintenance screen instead of the dashboard.
 */
export async function MaintenanceBanner({
  view,
  maintenance,
}: {
  view: "readOnly" | "staff";
  maintenance: MaintenanceSettings;
}) {
  const t = await getTranslations("maintenance");

  if (view === "staff") {
    return (
      <div
        role="region"
        aria-label={t("staff.label")}
        className="flex flex-col gap-2 border-b border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-sm text-violet-950 sm:flex-row sm:items-center md:px-8 dark:text-violet-100"
      >
        <ShieldAlert
          className="hidden size-4 shrink-0 text-violet-600 sm:block dark:text-violet-300"
          aria-hidden
        />
        <p className="min-w-0 flex-1">
          <span className="font-medium">
            {maintenance.mode === "full"
              ? t("staff.full")
              : t("staff.readOnly")}
          </span>{" "}
          <span className="text-violet-900/80 dark:text-violet-100/80">
            {t("staff.note")}
          </span>
        </p>
        <Link
          href={PLATFORM_SETTINGS_PATH}
          className="focus-visible:ring-ring/50 inline-flex shrink-0 items-center gap-1 self-start rounded-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-3 sm:self-auto"
        >
          {t("staff.manage")}
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label={t("readOnly.label")}
      className="flex items-start gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-950 md:px-8 dark:text-amber-100"
    >
      <Construction
        className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
        aria-hidden
      />
      <div className="min-w-0 flex-1 space-y-1">
        <p>
          <span className="font-medium">{t("readOnly.title")}</span>{" "}
          <span className="text-amber-900/80 dark:text-amber-100/80">
            {t("readOnly.description")}
          </span>
        </p>
        <MaintenanceDetails
          maintenance={maintenance}
          className="text-amber-900/80 dark:text-amber-100/80"
        />
      </div>
    </div>
  );
}
