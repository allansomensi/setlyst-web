import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Eye } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadErrorNotice } from "@/components/load-error-notice";
import { AdminPageHeader } from "@/components/staff/admin-page-header";
import { fetchServerApi } from "@/lib/api-server";
import { requireStaffPage } from "@/lib/staff-guard";
import type { PlatformSettings } from "@/types/operations";
import { PlatformSettingsForm } from "./_components/platform-settings-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("platformAdmin");
  return { title: t("title") };
}

/**
 * Platform switches. Every staff member can see them (moderators read
 * only); changing them is admin-only, like the API.
 */
export default async function PlatformSettingsPage() {
  const { can } = await requireStaffPage("platform");
  const canEdit = can("platform.write");
  const t = await getTranslations("platformAdmin");
  const settings = await fetchServerApi<PlatformSettings>(
    "/admin/settings/platform",
  ).catch(() => null);

  return (
    <>
      <AdminPageHeader title={t("title")} description={t("description")} />
      {!canEdit && (
        <Alert>
          <Eye className="size-4" />
          <AlertDescription>{t("readOnly")}</AlertDescription>
        </Alert>
      )}
      {settings === null ? (
        <LoadErrorNotice />
      ) : (
        <PlatformSettingsForm
          // A fresh form after every save (the API normalizes what it
          // stores) or a change made elsewhere.
          key={JSON.stringify(settings)}
          initial={settings}
          canEdit={canEdit}
        />
      )}
    </>
  );
}
