import Link from "next/link";
import { ListMusic } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { LogoutButton } from "./_components/logout-button";
import { SidebarLinks } from "./_components/sidebar-links";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="bg-muted/40 flex min-h-screen">
      <aside className="bg-background flex w-64 flex-col border-r">
        <div className="flex h-16 items-center border-b px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xl font-bold"
          >
            <ListMusic className="h-6 w-6" />
            Setlyst
          </Link>
        </div>

        <SidebarLinks />

        <div className="flex items-center justify-between border-t p-4">
          <div className="overflow-hidden pr-2">
            <p className="truncate text-sm font-medium">{session.user?.name}</p>
            <p className="text-muted-foreground truncate text-xs capitalize">
              {session.user?.role}
            </p>
          </div>
          <LogoutButton />
        </div>
      </aside>

      <main className="flex h-screen flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8">{children}</div>
      </main>
    </div>
  );
}
