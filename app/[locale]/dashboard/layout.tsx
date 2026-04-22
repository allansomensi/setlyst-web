import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { Sidebar } from "./_components/sidebar";
import { MobileNav } from "./_components/mobile-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const locale = await getLocale();

  if (!session || session.error === "TokenExpired") {
    redirect(`/${locale}/login`);
  }

  return (
    <div className="bg-muted/40 flex min-h-screen flex-col md:flex-row">
      <Sidebar user={{ name: session.user?.name, role: session.user?.role }} />
      <MobileNav
        user={{ name: session.user?.name, role: session.user?.role }}
      />
      <main className="flex h-screen flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
