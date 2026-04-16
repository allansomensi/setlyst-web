import Link from "next/link";
import { Disc3, Home, ListMusic, Music } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { LogoutButton } from "./_components/logout-button";

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
      {/* Sidebar */}
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

        <nav className="flex-1 space-y-2 p-4">
          <Link
            href="/dashboard"
            className="hover:bg-muted text-muted-foreground hover:text-foreground flex items-center gap-3 rounded-md px-3 py-2 transition-colors"
          >
            <Home className="h-5 w-5" />
            Home
          </Link>
          <Link
            href="/dashboard/artists"
            className="bg-muted text-foreground flex items-center gap-3 rounded-md px-3 py-2 font-medium transition-colors"
          >
            <Disc3 className="h-5 w-5" />
            Artists
          </Link>
          <Link
            href="/dashboard/songs"
            className="hover:bg-muted text-muted-foreground hover:text-foreground flex items-center gap-3 rounded-md px-3 py-2 transition-colors"
          >
            <Music className="h-5 w-5" />
            Songs
          </Link>
        </nav>

        {/* Rodapé da Sidebar Minimalista */}
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

      {/* Main Content */}
      <main className="flex h-screen flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8">{children}</div>
      </main>
    </div>
  );
}
