import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { authOptions } from "@/lib/auth";
import { fetchAllServerPages } from "@/lib/api-server";
import { isStaffRole } from "@/lib/staff-permissions";
import type { User } from "@/types/api";
import { UsersTable } from "./_components/users-table";

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
  const session = await getServerSession(authOptions);

  if (!session || !isStaffRole(session.user.role)) {
    return redirect({ href: "/dashboard", locale });
  }

  const response = await fetchAllServerPages<User>("/users");

  return (
    <div className="w-full space-y-4">
      <UsersTable
        initialUsers={response.data ?? []}
        actor={{ id: session.user.id, role: session.user.role }}
      />
    </div>
  );
}
