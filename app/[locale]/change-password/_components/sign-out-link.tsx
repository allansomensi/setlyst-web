"use client";

import { useState } from "react";
import { secureSignOut } from "@/lib/client-logout";
import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignOutLink() {
  const t = useTranslations("changePassword");
  const locale = useLocale();
  // Signing out takes a round trip or two before the page changes: without
  // this a second click started a second sign-out.
  const [pending, setPending] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await secureSignOut({ callbackUrl: `/${locale}/login` });
        } catch {
          setPending(false);
        }
      }}
    >
      {pending && <Loader2 className="animate-spin" />}
      {t("signOut")}
    </Button>
  );
}
