import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ApiError, fetchServerApi } from "@/lib/api-server";
import { requireStaffPage } from "@/lib/staff-guard";
import type { Plan } from "@/types/billing";
import { PlanEditor } from "../../_components/plan-editor";

type Params = Promise<{ code: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { code } = await params;
  const t = await getTranslations("billingAdmin.planEditor");
  return {
    title: code === "new" ? t("newTitle") : t("editTitle", { name: code }),
  };
}

export default async function PlanEditorPage({ params }: { params: Params }) {
  const { code } = await params;
  // Any staff member can read a plan; only admins create or change one.
  const { isAdmin } = await requireStaffPage(
    code === "new" ? "billing.write" : "billing",
    "/dashboard/admin/billing",
  );
  if (code === "new") return <PlanEditor plan={null} />;
  let plan: Plan;
  try {
    plan = await fetchServerApi<Plan>(
      `/admin/plans/${encodeURIComponent(code)}`,
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  return <PlanEditor key={plan.updated_at} plan={plan} readOnly={!isAdmin} />;
}
