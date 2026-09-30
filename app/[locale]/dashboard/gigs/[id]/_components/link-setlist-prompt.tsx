"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Gig, Setlist } from "@/types/api";
import { GigDialog, BandOption } from "../../_components/gigs-dialog";
import { Button } from "@/components/ui/button";
import { ListMusic, Plus } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Link } from "@/components/nav-link";

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
      <EmptyState
        icon={ListMusic}
        title={t("noSetlistLinked")}
        description={hasOptions ? undefined : t("noSetlistsAvailable")}
        actions={
          hasOptions ? (
            <Button
              onClick={() => {
                setSession((n) => n + 1);
                setIsOpen(true);
              }}
            >
              <ListMusic className="mr-2 h-4 w-4" aria-hidden />
              {t("linkSetlistAction")}
            </Button>
          ) : (
            <Button variant="outline" asChild>
              <Link
                href={
                  gig.band_id
                    ? `/dashboard/bands/${gig.band_id}/setlists`
                    : "/dashboard/setlists"
                }
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden />
                {t("createSetlistAction")}
              </Link>
            </Button>
          )
        }
      />

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
