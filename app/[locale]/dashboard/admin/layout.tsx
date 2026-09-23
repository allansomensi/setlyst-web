import { getServerSession } from "next-auth";
import { redirect } from "@/i18n/routing";
import { authOptions } from "@/lib/auth";
import { isStaffRole } from "@/lib/staff-permissions";

/**
 * The staff console. Every page under it is for admins and moderators;
 * the API enforces the finer split (moderators review, admins change).
 */
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);
  if (!session || !isStaffRole(session.user.role)) {
    return redirect({ href: "/dashboard", locale });
  }
  return <div className="mx-auto w-full max-w-6xl space-y-6">{children}</div>;
}
