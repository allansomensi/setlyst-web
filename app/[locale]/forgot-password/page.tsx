import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LifeBuoy, Mail, ShieldCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Link } from "@/components/nav-link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SUPPORT_EMAIL } from "@/lib/links";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("forgotPassword") };
}

/**
 * Setlyst doesn't send email, so a forgotten password is recovered
 * through staff: a moderator or admin issues a temporary password, which
 * must be replaced at the next sign-in. This page explains exactly that,
 * instead of the 404 the "Forgot password?" link used to lead to.
 */
export default async function ForgotPasswordPage() {
  const t = await getTranslations("forgotPassword");

  return (
    <AuthShell>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="bg-primary/10 text-primary mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full">
            <LifeBuoy className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold">{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4 text-sm">
            <li className="flex gap-3">
              <Mail className="text-primary mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {t.rich("stepContact", {
                  email: SUPPORT_EMAIL,
                  link: (chunks) => (
                    <a
                      href={`mailto:${SUPPORT_EMAIL}`}
                      className="text-primary font-medium hover:underline"
                    >
                      {chunks}
                    </a>
                  ),
                })}
              </span>
            </li>
            <li className="flex gap-3">
              <ShieldCheck className="text-primary mt-0.5 h-4 w-4 shrink-0" />
              <span>{t("stepTemporary")}</span>
            </li>
          </ol>
          <p className="text-muted-foreground mt-4 text-xs">{t("safety")}</p>
        </CardContent>
        <CardFooter className="justify-center border-t py-4">
          <Button asChild variant="outline">
            <Link href="/login">{t("back")}</Link>
          </Button>
        </CardFooter>
      </Card>
    </AuthShell>
  );
}
