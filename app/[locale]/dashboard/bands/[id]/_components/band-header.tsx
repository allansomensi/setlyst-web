"use client";

import { AuditStamp } from "@/components/audit-stamp";
import { useState } from "react";
import { BandWithMembership } from "@/types/api";
import { BandAvatar } from "@/components/bands/band-avatar";
import { BandRoleBadge } from "@/components/bands/band-role-badge";
import { BandDialog } from "../../_components/band-dialog";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { DetailBackButton, DetailHeader } from "@/components/detail-header";
import { useTranslations } from "next-intl";
import { PinButton } from "@/components/content/pin-button";

export function BandHeader({ band }: { band: BandWithMembership }) {
  const t = useTranslations("bands");
  const tNav = useTranslations("nav");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const canManage = band.my_role === "owner" || band.my_role === "admin";

  // The band's setlists and shows used to have buttons here too, next to
  // the tabs that hold the same lists (each with its own "see all" link):
  // two ways to the same place, side by side. The header keeps what is
  // about the band itself.
  return (
    <>
      <DetailHeader
        actions={
          <>
            <PinButton
              type="band"
              id={band.id}
              name={band.name}
              pinned={!!band.is_pinned}
              variant="default"
            />
            {canManage && (
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(true)}
                className="gap-2"
              >
                <Pencil className="h-4 w-4" aria-hidden />
                {t("menu.edit")}
              </Button>
            )}
          </>
        }
      >
        <DetailBackButton href="/dashboard/bands" label={tNav("bands")} />

        <BandAvatar
          bandId={band.id}
          name={band.name}
          logoUrl={band.logo_url}
          className="h-14 w-14 shrink-0 text-lg"
        />

        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight wrap-break-word sm:text-3xl">
              {band.name}
            </h1>
            <BandRoleBadge role={band.my_role} />
          </div>
          {band.description && (
            <p className="text-muted-foreground max-w-2xl wrap-break-word">
              {band.description}
            </p>
          )}
          <p className="text-muted-foreground text-sm">
            {t("memberCount", { count: band.member_count })}
          </p>
          <AuditStamp
            updatedAt={band.updated_at}
            updatedBy={band.updated_by_username}
          />
        </div>
      </DetailHeader>

      <BandDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        band={band}
      />
    </>
  );
}
