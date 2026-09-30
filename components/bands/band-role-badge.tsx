import { Crown, ShieldCheck, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BandRole } from "@/types/api";
import { useTranslations } from "next-intl";

/**
 * A ladder of emphasis, strongest for the owner. The owner used to be the
 * destructive red, which read as a warning ("something is wrong with this
 * band") on the one badge every owner sees on every band page.
 */
const ROLE_STYLES: Record<BandRole, string> = {
  owner:
    "border-amber-500/35 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  admin: "border-primary/30 bg-primary/10 text-primary",
  moderator: "border-border bg-transparent text-foreground",
  member: "border-transparent bg-secondary text-secondary-foreground",
};

const ROLE_ICONS: Partial<Record<BandRole, typeof Crown>> = {
  owner: Crown,
  admin: ShieldCheck,
  moderator: Shield,
};

export function BandRoleBadge({
  role,
  className,
}: {
  role: BandRole;
  className?: string;
}) {
  const t = useTranslations("bands.roles");
  const Icon = ROLE_ICONS[role];

  return (
    <Badge variant="outline" className={cn(ROLE_STYLES[role], className)}>
      {Icon && <Icon aria-hidden />}
      {t(role)}
    </Badge>
  );
}
