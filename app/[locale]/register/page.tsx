"use client";

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

export default function RegisterPage() {
  const t = useTranslations("auth.register");
  const router = useRouter();

  const [error, registerAction, isPending] = useActionState(
    async (_previousState: string | null, formData: FormData) => {
      const username = (formData.get("username") as string)?.trim();
      const password = formData.get("password") as string;
      const email = (formData.get("email") as string)?.trim() || undefined;
      const first_name =
        (formData.get("first_name") as string)?.trim() || undefined;
      const last_name =
        (formData.get("last_name") as string)?.trim() || undefined;

      if (!username || username.length < 3 || username.length > 128) {
        return t("errors.usernameLength");
      }
      if (!password || password.length < 8 || password.length > 256) {
        return t("errors.passwordLength");
      }

      const payload: Record<string, string> = { username, password };
      if (email) payload.email = email;
      if (first_name) payload.first_name = first_name;
      if (last_name) payload.last_name = last_name;

      const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

      try {
        const res = await fetch(`${apiUrl}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          if (res.status === 409) return t("errors.conflict");
          if (res.status === 422) return t("errors.validation");
          return t("errors.generic");
        }

        toast.success(t("success"));
        router.push("/login?registered=true");
        return null;
      } catch {
        return t("errors.serverError");
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
          <form action={registerAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">
                {t("username")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder={t("usernamePlaceholder")}
                required
                disabled={isPending}
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={t("emailPlaceholder")}
                disabled={isPending}
                autoComplete="email"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">{t("firstName")}</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  type="text"
                  placeholder={t("firstNamePlaceholder")}
                  disabled={isPending}
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">{t("lastName")}</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  type="text"
                  placeholder={t("lastNamePlaceholder")}
                  disabled={isPending}
                  autoComplete="family-name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                {t("password")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder={t("passwordPlaceholder")}
                required
                disabled={isPending}
                autoComplete="new-password"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="text-center text-sm font-medium text-red-500"
              >
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
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
            {t("alreadyHaveAccount")}{" "}
            <Link
              href="/login"
              className="text-primary font-medium hover:underline"
            >
              {t("signIn")}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
