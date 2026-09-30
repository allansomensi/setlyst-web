"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  prepareGoogleSignIn,
  type PrepareGoogleInput,
} from "@/lib/actions/google-auth";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { routing } from "@/i18n/routing";
import { stripLocale } from "@/lib/route-access";

/** Google's four-color "G" (brand guidelines: never recolored). */
export function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
      className={cn("size-[18px]", className)}
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

interface GoogleButtonProps extends PrepareGoogleInput {
  /** Defaults to "Continuar com Google". */
  label?: string;
  disabled?: boolean;
  /** Return false to cancel (e.g. consent not given yet). */
  onBeforeStart?: () => boolean;
  className?: string;
}

/**
 * "Continuar com Google", following Google's branding guidelines: the
 * official "G", never recolored, on Google's light button (white surface,
 * neutral border, dark text) in the light theme; in the dark theme, on
 * the same surface as the form's fields (a dark button, as Google's
 * dark variant is), so it sits with the rest of the form instead of
 * glaring out of it as a white slab. Saves the sign-in
 * intent server-side, then leaves for Google.
 */
export function GoogleButton({
  label,
  disabled,
  onBeforeStart,
  className,
  ...intent
}: GoogleButtonProps) {
  const t = useTranslations("googleAuth");
  const locale = useLocale();
  const [pending, setPending] = useState(false);

  // Coming back from Google's consent screen with the browser's Back
  // button restores this page from the bfcache exactly as it was left:
  // with the button disabled and spinning. Reset it so it can be retried.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setPending(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const start = async () => {
    if (onBeforeStart && !onBeforeStart()) return;
    setPending(true);
    try {
      const ready = await prepareGoogleSignIn(intent);
      if (!ready) {
        toast.error(t("unavailable"));
        setPending(false);
        return;
      }
      const callbackUrl =
        intent.mode === "link"
          ? // Not used in practice: linking always comes back through the
            // settings' confirmation step (`?google=confirm`, lib/auth.ts).
            `/${locale}/dashboard/settings/security`
          : `/${locale}${
              intent.callbackPath
                ? stripLocale(intent.callbackPath, routing.locales)
                : "/dashboard"
            }`;
      await signIn("google", { callbackUrl });
    } catch {
      toast.error(t("failed"));
      setPending(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={start}
      disabled={disabled || pending}
      className={cn(
        "dark:border-input dark:bg-input/30 dark:text-foreground dark:hover:bg-input/50 dark:hover:text-foreground h-10 w-full gap-3 border-[#747775] bg-white font-medium text-[#1f1f1f] shadow-xs hover:bg-[#f7f7f7] hover:text-[#1f1f1f]",
        className,
      )}
    >
      {pending ? (
        <Loader2 className="size-[18px] animate-spin" />
      ) : (
        <GoogleLogo />
      )}
      {label ?? t("continue")}
    </Button>
  );
}

/** "ou" between the form and the Google button. */
export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="text-muted-foreground flex items-center gap-3 text-xs">
      <span className="bg-border h-px flex-1" />
      <span className="tracking-wide uppercase">{label}</span>
      <span className="bg-border h-px flex-1" />
    </div>
  );
}
