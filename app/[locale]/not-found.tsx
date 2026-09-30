import { getTranslations } from "next-intl/server";
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
    <main className="bg-background relative isolate flex min-h-dvh flex-col items-center justify-center gap-6 overflow-hidden px-4 py-16 text-center">
      {/* A soft stage-light glow behind the number: the one decoration,
          so the page reads as part of Setlyst rather than a bare error. */}
      <div
        aria-hidden
        className="bg-primary/15 pointer-events-none absolute top-1/2 left-1/2 -z-10 size-[28rem] -translate-x-1/2 -translate-y-2/3 rounded-full blur-3xl"
      />
      <Link
        href="/"
        className="focus-visible:ring-ring/50 rounded-xl outline-none focus-visible:ring-3"
      >
        <AppLogo size={44} className="rounded-xl" />
      </Link>
      <div className="max-w-md space-y-3">
        <p
          aria-hidden
          className="from-primary to-primary/40 bg-gradient-to-b bg-clip-text text-7xl leading-none font-extrabold tracking-tighter text-transparent tabular-nums sm:text-8xl"
        >
          404
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-balance">
          {t("title")}
        </h1>
        <p className="text-muted-foreground text-pretty">{t("description")}</p>
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
