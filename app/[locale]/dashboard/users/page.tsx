import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { fetchAllServerPages } from "@/lib/api-server";
import { fetchOrFailed, FETCH_FAILED } from "@/lib/fetch-or-failed";
import { isStaffRole } from "@/lib/staff-permissions";
import type { User } from "@/types/api";
import { UsersTable } from "./_components/users-table";
import { getSession } from "@/lib/server/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("users") };
}

export default async function UsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();

  if (!session || !isStaffRole(session.user.role)) {
    return redirect({ href: "/dashboard", locale });
  }

  // Every account, in pages of 100: a transient failure on any page shows
  // the retrying notice instead of the error boundary.
  const response = await fetchOrFailed(fetchAllServerPages<User>("/users"));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <UsersTable
        initialUsers={response === FETCH_FAILED ? [] : (response.data ?? [])}
        loadError={response === FETCH_FAILED}
        actor={{ id: session.user.id, role: session.user.role }}
      />
    </div>
  );
}
