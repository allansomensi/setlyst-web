"use client";

import { ShieldCheck, ShieldHalf } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/api";

/**
 * Platform roles have fixed colours everywhere in the app: admin is red,
 * moderator is green, regular users are neutral.
 */
export const ROLE_STYLES: Record<UserRole, string> = {
  admin:
    "border-red-500/30 bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  moderator:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  user: "border-border bg-secondary text-secondary-foreground",
};

/** Text-only colour for places where a badge is too heavy (sidebar). */
export const ROLE_TEXT_STYLES: Record<UserRole, string> = {
  admin: "text-red-600 dark:text-red-400",
  moderator: "text-emerald-600 dark:text-emerald-400",
  user: "text-muted-foreground",
};

export function PlatformRoleBadge({
  role,
  className,
}: {
  role: UserRole;
  className?: string;
}) {
  const t = useTranslations("roles");
  const Icon =
    role === "admin" ? ShieldCheck : role === "moderator" ? ShieldHalf : null;

  return (
    <Badge variant="outline" className={cn(ROLE_STYLES[role], className)}>
      {Icon && <Icon />}
      {t(role)}
    </Badge>
  );
}
