import "server-only";

import { fetchServerApi } from "@/lib/api-server";
import { getPublicPlans } from "@/lib/public-api";
import type { Plan } from "@/types/billing";
import type { LocalizedText } from "@/types/public";

export interface PlanOption {
  code: string;
  name: LocalizedText;
  is_public: boolean;
}

/**
 * Plans to choose from in staff forms (audiences, grants, rewards): every
 * plan, hidden ones included (`GET /admin/plans`, readable by any staff
 * member). Falls back to the public plans if that fails.
 */
export async function getPlanOptions(): Promise<PlanOption[]> {
  const plans = await fetchServerApi<Plan[]>("/admin/plans").catch(() => null);
  if (plans) {
    return [...plans]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(({ code, name, is_public }) => ({ code, name, is_public }));
  }
  const publicPlans = await getPublicPlans();
  return (publicPlans ?? []).map(({ code, name }) => ({
    code,
    name,
    is_public: true,
  }));
}
