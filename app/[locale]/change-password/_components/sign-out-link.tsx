"use client";

import { secureSignOut } from "@/lib/client-logout";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function SignOutLink() {
  const t = useTranslations("changePassword");
  const locale = useLocale();
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => secureSignOut({ callbackUrl: `/${locale}/login` })}
    >
      {t("signOut")}
    </Button>
  );
}
