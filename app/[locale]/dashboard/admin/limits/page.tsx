import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { getTranslations } from "next-intl/server";
import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/staff/admin-page-header";
import { fetchServerApi } from "@/lib/api-server";
import { authOptions } from "@/lib/auth";
import type { QuotaLimits } from "@/types/api";
import { DefaultLimitsForm } from "./_components/default-limits-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("adminLimits") };
}

export default async function AdminLimitsPage() {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user.role === "admin";
  const t = await getTranslations("staff.limits");
  const limits = await fetchServerApi<QuotaLimits>("/admin/settings/quotas");

  return (
    <>
      <AdminPageHeader title={t("title")} description={t("description")} />
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {isAdmin ? t("howItWorks") : t("readOnly")}
        </AlertDescription>
      </Alert>
      <Card>
        <CardContent className="pt-6">
          <DefaultLimitsForm initial={limits} canEdit={isAdmin} />
        </CardContent>
      </Card>
    </>
  );
}
