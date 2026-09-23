"use client";

import { signIn, getSession } from "next-auth/react";
import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Link } from "@/components/nav-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AppLogo } from "@/components/app-logo";
import { PasswordInput } from "@/components/auth/password-input";
import { toast } from "sonner";
import { CheckCircle2, Info, Loader2 } from "lucide-react";
import { parseSignInError } from "@/lib/sign-in-errors";
import { describeApiError } from "@/lib/api-errors";
import { safeCallbackPath } from "@/lib/links";

const NOTICES = [
  "registered",
  "password_changed",
  "session",
  "expired",
] as const;
type Notice = (typeof NOTICES)[number];

function stripLocale(path: string, locale: string): string {
  return path.startsWith(`/${locale}/`) ? path.slice(locale.length + 1) : path;
}

export function LoginForm() {
  const t = useTranslations("auth.login");
  const tErrors = useTranslations("apiErrors");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const reason = searchParams.get("reason");
  const notice: Notice | null =
    searchParams.get("registered") === "true"
      ? "registered"
      : NOTICES.includes(reason as Notice)
        ? (reason as Notice)
        : null;
  const callbackPath = safeCallbackPath(searchParams.get("callbackUrl"));

  const [error, loginAction, isPending] = useActionState(
    async (): Promise<string | null> => {
      try {
        const result = await signIn("credentials", {
          username: username.trim(),
          password,
          redirect: false,
        });

        if (result?.error) {
          const { code, meta } = parseSignInError(result.error);
          if (code === "RATE_LIMITED") return t("rateLimited");
          if (code === "SERVICE_UNAVAILABLE") return t("connectionError");
          return (
            describeApiError(code, meta, (k, v) => tErrors(k, v), locale) ??
            t("invalidCredentials")
          );
        }

        const session = await getSession();
        if (session?.user?.mustChangePassword) {
          router.replace("/change-password");
          return null;
        }

        if (session?.user?.isFirstLogin === false) {
          toast.success(t("welcomeBack"));
        }
        router.replace(
          callbackPath ? stripLocale(callbackPath, locale) : "/dashboard",
        );
        router.refresh();
        return null;
      } catch {
        return t("connectionError");
      }
    },
    null,
  );

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center text-center">
        <AppLogo size={56} priority className="mx-auto mb-2 rounded-xl" />
        <CardTitle className="text-2xl font-bold">{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {notice && (
          <Alert
            variant={
              notice === "registered" || notice === "password_changed"
                ? "success"
                : "info"
            }
          >
            {notice === "registered" || notice === "password_changed" ? (
              <CheckCircle2 />
            ) : (
              <Info />
            )}
            <AlertDescription>{t(`notices.${notice}`)}</AlertDescription>
          </Alert>
        )}

        <form action={loginAction} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="username">{t("username")}</Label>
            <Input
              id="username"
              name="username"
              type="text"
              placeholder={t("usernamePlaceholder")}
              autoComplete="username"
              autoCapitalize="off"
              spellCheck={false}
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isPending}
              aria-invalid={Boolean(error)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t("password")}</Label>
              <Link
                href="/forgot-password"
                className="text-muted-foreground text-sm hover:underline"
              >
                {t("forgotPassword")}
              </Link>
            </div>
            <PasswordInput
              id="password"
              name="password"
              placeholder={t("passwordPlaceholder")}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isPending}
              aria-invalid={Boolean(error)}
            />
          </div>

          {error && (
            <p
              role="alert"
              className="text-destructive text-center text-sm font-medium"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isPending || !username.trim() || !password}
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
            href="/register"
            className="text-primary font-medium hover:underline"
          >
            {t("signUp")}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
