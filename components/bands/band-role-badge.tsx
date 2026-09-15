import { Badge } from "@/components/ui/badge";
import { BandRole } from "@/types/api";
import { useTranslations } from "next-intl";

const VARIANT_BY_ROLE: Record<
  BandRole,
  "default" | "destructive" | "outline" | "secondary"
> = {
  owner: "destructive",
  admin: "default",
  moderator: "outline",
  member: "secondary",
};

export function BandRoleBadge({ role }: { role: BandRole }) {
  const t = useTranslations("bands.roles");

  return (
    <Badge variant={VARIANT_BY_ROLE[role]} className="capitalize">
      {t(role)}
    </Badge>
  );
}
