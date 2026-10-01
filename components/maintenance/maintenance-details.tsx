import { getLocale, getTimeZone, getTranslations } from "next-intl/server";
import { formatApiDateTime } from "@/lib/dates";
import { expectedEnd } from "@/lib/maintenance";
import { cn } from "@/lib/utils";
import type { MaintenanceSettings } from "@/types/operations";

/**
 * "Expected back around …" in the viewer's time zone (the `tz` cookie,
 * see i18n/request.ts), or `null` when no end was given or it has
 * already passed.
 */
export async function expectedBackText(
  maintenance: Pick<MaintenanceSettings, "ends_at"> | null | undefined,
): Promise<string | null> {
  const end = expectedEnd(maintenance);
  if (!end) return null;
  const [t, locale, timeZone] = await Promise.all([
    getTranslations("maintenance"),
    getLocale(),
    getTimeZone(),
  ]);
  return t("expectedBack", {
    time: formatApiDateTime(end, locale, timeZone),
  });
}

/**
 * What the team said about the maintenance (any language, shown as
 * typed) and when the platform should be back. Renders nothing when
 * neither is known.
 */
export async function MaintenanceDetails({
  maintenance,
  className,
}: {
  maintenance: Pick<MaintenanceSettings, "message" | "ends_at">;
  className?: string;
}) {
  const t = await getTranslations("maintenance");
  const expected = await expectedBackText(maintenance);
  if (!maintenance.message && !expected) return null;

  return (
    <div className={cn("space-y-1", className)}>
      {maintenance.message && (
        <p className="break-words whitespace-pre-line">
          <span className="sr-only">{t("teamMessage")}: </span>
          {maintenance.message}
        </p>
      )}
      {expected && <p className="font-medium">{expected}</p>}
    </div>
  );
}
