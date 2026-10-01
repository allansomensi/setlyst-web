"use client";

import { LogOut } from "lucide-react";
import { secureSignOut } from "@/lib/client-logout";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/**
 * Signs out. An icon in the navigation; `labelled` makes it a regular
 * button with its text, for screens without the navigation (the
 * maintenance screen).
 */
export function LogoutButton({ labelled = false }: { labelled?: boolean }) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const signOut = () => secureSignOut({ callbackUrl: `/${locale}/login` });

  if (labelled) {
    return (
      <Button variant="outline" className="w-full sm:w-auto" onClick={signOut}>
        <LogOut className="mr-2 h-4 w-4" aria-hidden />
        {t("logout")}
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-muted-foreground hover:bg-muted/50 hover:text-foreground h-9 w-9"
      onClick={signOut}
      title={t("logout")}
    >
      <LogOut className="h-4 w-4" />
      <span className="sr-only">{t("logout")}</span>
    </Button>
  );
}
