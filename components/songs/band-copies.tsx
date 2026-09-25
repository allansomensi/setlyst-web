"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CircleCheck, Guitar, RefreshCw } from "lucide-react";
import { Link } from "@/components/nav-link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SyncBandCopyDialog } from "./sync-band-copy-dialog";
import type { BandCopyStatus } from "@/types/api";

/** The copies as they are after `synced` was brought up to date. */
function withSynced(copies: BandCopyStatus[], synced: BandCopyStatus) {
  return copies.map((copy) =>
    copy.song_id === synced.song_id
      ? { ...synced, has_updates: false, band_edited: false }
      : copy,
  );
}

/**
 * On a personal song's page: the bands playing a copy of it, whether each
 * copy is in step with this version, and a one-tap update for the ones
 * that aren't.
 */
export function BandCopiesCard({
  title,
  copies: initialCopies,
}: {
  title: string;
  copies: BandCopyStatus[];
}) {
  const t = useTranslations("bandCopies");
  const [copies, setCopies] = useState(initialCopies);
  const [toSync, setToSync] = useState<BandCopyStatus | null>(null);

  if (copies.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Guitar className="h-4 w-4" aria-hidden />
          {t("cardTitle")}
        </CardTitle>
        <CardDescription>{t("cardDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {copies.map((copy) => (
            <li key={copy.song_id} className="space-y-1.5">
              <Link
                href={`/dashboard/songs/${copy.song_id}`}
                className="block truncate text-sm font-medium hover:underline"
              >
                {copy.band_name}
              </Link>
              {copy.has_updates ? (
                <>
                  <p className="text-muted-foreground text-xs">
                    {copy.band_edited ? t("outdatedEdited") : t("outdated")}
                  </p>
                  {copy.can_update ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5"
                      onClick={() => setToSync(copy)}
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                      {t("updateCopy")}
                    </Button>
                  ) : (
                    <p className="text-muted-foreground text-xs italic">
                      {t("noPermission")}
                    </p>
                  )}
                </>
              ) : (
                <p className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                  <CircleCheck className="h-3.5 w-3.5" aria-hidden />
                  {t("inSync")}
                </p>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
      <SyncBandCopyDialog
        copy={toSync}
        title={title}
        onClose={() => setToSync(null)}
        onSynced={(synced) => setCopies((prev) => withSynced(prev, synced))}
      />
    </Card>
  );
}

/**
 * On a band's copy of the person's own song: a notice when their version
 * has changes the band's copy lacks, with the update right there.
 */
export function BandCopyUpdateBanner({
  title,
  copy: initialCopy,
}: {
  title: string;
  copy: BandCopyStatus;
}) {
  const t = useTranslations("bandCopies");
  const [copy, setCopy] = useState(initialCopy);
  const [toSync, setToSync] = useState<BandCopyStatus | null>(null);

  if (!copy.has_updates) return null;

  return (
    <section
      aria-label={t("bannerTitle")}
      className="bg-primary/5 border-primary/30 flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{t("bannerTitle")}</p>
        <p className="text-muted-foreground text-sm">
          {copy.band_edited ? t("bannerEdited") : t("banner")}
        </p>
        {!copy.can_update && (
          <p className="text-muted-foreground text-xs italic">
            {t("noPermission")}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button asChild variant="ghost" size="sm" className="h-9">
          <Link href={`/dashboard/songs/${copy.source_id}`}>
            {t("viewMine")}
          </Link>
        </Button>
        {copy.can_update && (
          <Button
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => setToSync(copy)}
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            {t("updateFromMine")}
          </Button>
        )}
      </div>
      <SyncBandCopyDialog
        copy={toSync}
        title={title}
        onClose={() => setToSync(null)}
        onSynced={(synced) =>
          setCopy({ ...synced, has_updates: false, band_edited: false })
        }
      />
    </section>
  );
}
