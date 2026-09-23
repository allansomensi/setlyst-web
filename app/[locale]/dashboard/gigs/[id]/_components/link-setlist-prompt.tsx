"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Gig, Setlist } from "@/types/api";
import { GigDialog, BandOption } from "../../_components/gigs-dialog";
import { Button } from "@/components/ui/button";
import { ListMusic } from "lucide-react";

interface LinkSetlistPromptProps {
  gig: Gig;
  personalSetlists: Setlist[];
  bands: BandOption[];
}

export function LinkSetlistPrompt({
  gig,
  personalSetlists,
  bands,
}: LinkSetlistPromptProps) {
  const t = useTranslations("gigs");
  const [isOpen, setIsOpen] = useState(false);
  // Bumped on every open so the dialog starts from the saved gig.
  const [session, setSession] = useState(0);

  const hasOptions = gig.band_id
    ? (bands.find((b) => b.id === gig.band_id)?.setlists.length ?? 0) > 0
    : personalSetlists.length > 0;

  return (
    <>
      <p className="text-muted-foreground text-sm">{t("noSetlistLinked")}</p>
      {hasOptions ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSession((n) => n + 1);
            setIsOpen(true);
          }}
        >
          <ListMusic className="mr-2 h-4 w-4" />
          {t("linkSetlistAction")}
        </Button>
      ) : (
        <p className="text-muted-foreground text-xs">
          {t("noSetlistsAvailable")}
        </p>
      )}

      <GigDialog
        key={`${gig.id}:${session}`}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        gig={gig}
        personalSetlists={personalSetlists}
        bands={bands}
        fixedBandId={gig.band_id ?? undefined}
      />
    </>
  );
}
