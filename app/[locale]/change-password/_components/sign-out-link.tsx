"use client";

import { signOut } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function SignOutLink() {
  const t = useTranslations("changePassword");
  const locale = useLocale();
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
    >
      {t("signOut")}
    </Button>
  );
}
