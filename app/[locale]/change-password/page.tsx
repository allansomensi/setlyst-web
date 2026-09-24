import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { SignOutLink } from "./_components/sign-out-link";
import { getSession } from "@/lib/server/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("changePassword") };
}

/**
 * The mandatory password change. The proxy keeps an account flagged with
 * `must_change_password` here (and the API refuses everything else) until
 * a compliant password is set.
 */
export default async function ChangePasswordPage() {
  const session = await getSession();
  const locale = await getLocale();
  if (!session || session.error === "TokenExpired") {
    redirect(`/${locale}/login`);
  }

  const t = await getTranslations("changePassword");

  return (
    <AuthShell>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="bg-primary/10 text-primary mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full">
            <KeyRound className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {t("requiredTitle")}
          </CardTitle>
          <CardDescription>
            {t("requiredDescription", { username: session.user.name ?? "" })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ChangePasswordForm
            username={session.user.name ?? ""}
            secondaryAction={<SignOutLink />}
          />
        </CardContent>
      </Card>
    </AuthShell>
  );
}
