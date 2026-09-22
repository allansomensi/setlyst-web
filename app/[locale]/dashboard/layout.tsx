import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { Sidebar } from "./_components/sidebar";
import { MobileNav } from "./_components/mobile-nav";
import { OfflineStatusBanner } from "@/components/offline-status-banner";

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
    // A fixed-height shell (dvh, so mobile browser bars are accounted for)
    // with the page scrolling inside <main>. Previously <main> was a full
    // `h-screen` *below* the 64px mobile header, so every page on a phone
    // was 64px taller than the screen and scrolled twice — the document
    // and the content area.
    <div className="bg-muted/40 flex h-dvh flex-col overflow-hidden md:flex-row">
      <Sidebar user={{ name: session.user?.name, role: session.user?.role }} />
      <MobileNav
        user={{ name: session.user?.name, role: session.user?.role }}
      />
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <OfflineStatusBanner />
        <div className="flex-1 overflow-y-auto p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
