"use client";

import { signIn } from "next-auth/react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const t = useTranslations("auth.login");
  const router = useRouter();

  const [error, loginAction, isPending] = useActionState(
    async (_previousState: string | null, formData: FormData) => {
      const username = formData.get("username") as string;
      const password = formData.get("password") as string;

      try {
        const result = await signIn("credentials", {
          username,
          password,
          redirect: false,
        });

        if (result?.error) {
          toast.error(t("invalidCredentials"));
          return t("invalidCredentials");
        }

        toast.success(t("welcomeBack"));
        router.push("dashboard");
        router.refresh();
        return null;
      } catch {
        toast.error(t("connectionError"));
        return t("connectionError");
      }
    },
    null,
  );

  return (
    <div className="bg-muted/40 flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={loginAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t("username")}</Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder={t("usernamePlaceholder")}
                required
                disabled={isPending}
                tabIndex={1}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t("password")}</Label>
                <Link
                  href="/forgot-password"
                  className="text-muted-foreground text-sm hover:underline"
                  tabIndex={4}
                >
                  {t("forgotPassword")}
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder={t("passwordPlaceholder")}
                required
                disabled={isPending}
                tabIndex={2}
              />
            </div>

            {error && (
              <p className="text-center text-sm font-medium text-red-500">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isPending}
              tabIndex={3}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("submitting")}
                </>
              ) : (
                t("submit")
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t py-4">
          <p className="text-muted-foreground text-sm">
            {t("noAccount")}{" "}
            <Link
              href="register"
              className="text-primary font-medium hover:underline"
              tabIndex={5}
            >
              {t("signUp")}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
