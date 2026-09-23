import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordFlow } from "./_components/forgot-password-flow";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("forgotPassword") };
}

/**
 * Password recovery by e-mail: the account's address receives a 6-digit
 * code, which sets a new password (and signs the account out
 * everywhere). Also how an account created with Google sets its first
 * password.
 */
export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <Suspense>
        <ForgotPasswordFlow />
      </Suspense>
    </AuthShell>
  );
}
