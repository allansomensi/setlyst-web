"use client";

import { useState } from "react";
import { BandWithMembership } from "@/types/api";
import { BandAvatar } from "@/components/bands/band-avatar";
import { BandRoleBadge } from "@/components/bands/band-role-badge";
import { BandDialog } from "../../_components/band-dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Pencil, ListMusic, CalendarDays } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export function BandHeader({ band }: { band: BandWithMembership }) {
  const t = useTranslations("bands");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const canManage = band.my_role === "owner" || band.my_role === "admin";

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3 sm:gap-4">
        <Button variant="outline" size="icon" asChild className="shrink-0">
          <Link href="/dashboard/bands">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>

        <BandAvatar
          name={band.name}
          logoUrl={band.logo_url}
          className="h-14 w-14 shrink-0 text-lg"
        />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight break-words sm:text-3xl">
              {band.name}
            </h1>
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

      <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
        <Button variant="outline" asChild className="gap-2 px-2.5 sm:px-4">
          <Link href={`/dashboard/bands/${band.id}/setlists`}>
            <ListMusic className="h-4 w-4" />
            <span className="hidden sm:inline">{t("viewSetlists")}</span>
          </Link>
        </Button>
        <Button variant="outline" asChild className="gap-2 px-2.5 sm:px-4">
          <Link href={`/dashboard/bands/${band.id}/gigs`}>
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">{t("viewGigs")}</span>
          </Link>
        </Button>
        {canManage && (
          <Button
            variant="outline"
            onClick={() => setIsDialogOpen(true)}
            className="gap-2 px-2.5 sm:px-4"
          >
            <Pencil className="h-4 w-4" />
            <span className="hidden sm:inline">{t("menu.edit")}</span>
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
