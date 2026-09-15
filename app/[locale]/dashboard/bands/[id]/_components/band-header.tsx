"use client";

import { useState } from "react";
import { BandWithMembership } from "@/types/api";
import { BandAvatar } from "@/components/bands/band-avatar";
import { BandRoleBadge } from "@/components/bands/band-role-badge";
import { BandDialog } from "../../_components/band-dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Pencil, ListMusic } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export function BandHeader({ band }: { band: BandWithMembership }) {
  const t = useTranslations("bands");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const canManage = band.my_role === "owner" || band.my_role === "admin";

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/bands">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>

        <BandAvatar
          name={band.name}
          logoUrl={band.logo_url}
          className="h-14 w-14 text-lg"
        />

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{band.name}</h1>
            <BandRoleBadge role={band.my_role} />
          </div>
          {band.description && (
            <p className="text-muted-foreground">{band.description}</p>
          )}
          <p className="text-muted-foreground mt-1 text-sm">
            {t("memberCount", { count: band.member_count })}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button variant="outline" asChild>
          <Link href={`/dashboard/bands/${band.id}/setlists`}>
            <ListMusic className="mr-2 h-4 w-4" />
            {t("viewSetlists")}
          </Link>
        </Button>
        {canManage && (
          <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            {t("menu.edit")}
          </Button>
        )}
      </div>

      <BandDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        band={band}
      />
    </div>
  );
}
