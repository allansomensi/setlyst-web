"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const t = useTranslations("nav");
  const locale = useLocale();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-muted-foreground hover:bg-muted/50 hover:text-foreground h-8 w-8"
      onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
      title={t("logout")}
    >
      <LogOut className="h-4 w-4" />
      <span className="sr-only">{t("logout")}</span>
    </Button>
  );
}
