import { getTranslations } from "next-intl/server";
import { Compass } from "lucide-react";
import { Link } from "@/components/nav-link";
import { AppLogo } from "@/components/app-logo";
import { Button } from "@/components/ui/button";
import { isSignedIn } from "@/lib/site-session";

export default async function NotFound() {
  const [t, signedIn] = await Promise.all([
    getTranslations("notFound"),
    isSignedIn(),
  ]);

  return (
    <main className="bg-background flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <AppLogo size={48} className="rounded-xl" />
      <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
        <Compass className="size-6" aria-hidden />
      </div>
      <div className="max-w-md space-y-2">
        <p className="text-muted-foreground font-mono text-sm">404</p>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      {/* The dashboard is the natural way back for someone signed in; for
          everyone else it is only a detour through the login page. */}
      <div className="flex flex-wrap justify-center gap-2">
        {signedIn ? (
          <>
            <Button asChild size="lg">
              <Link href="/dashboard">{t("dashboard")}</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/">{t("home")}</Link>
            </Button>
          </>
        ) : (
          <Button asChild size="lg">
            <Link href="/">{t("home")}</Link>
          </Button>
        )}
      </div>
    </main>
  );
}
