import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { isGoogleSignInEnabled } from "@/lib/server/google-auth";
import { getPlatformStatus } from "@/lib/public-api";
import { signInRestricted } from "@/lib/maintenance";
import { MaintenanceSignInNotice } from "@/components/maintenance/sign-in-notice";
import { LoginForm } from "./_components/login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("login") };
}

export default async function LoginPage() {
  // Full maintenance: only staff can sign in, which the page says up
  // front (the form stays usable for them).
  const platform = await getPlatformStatus();
  const notice =
    platform && signInRestricted(platform) ? (
      <MaintenanceSignInNotice maintenance={platform.maintenance} />
    ) : null;

  return (
    <AuthShell>
      <Suspense>
        <LoginForm
          googleEnabled={isGoogleSignInEnabled()}
          platformNotice={notice}
        />
      </Suspense>
    </AuthShell>
  );
}
