"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Library,
  ListMusic,
  Loader2,
  MapPin,
  Plus,
  Route,
} from "lucide-react";
import { Link } from "@/components/nav-link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UpgradeHint } from "@/components/content/upgrade-hint";
import { PinButton } from "@/components/content/pin-button";
import { useMounted } from "@/hooks/use-mounted";
import { formatWallClock, parseWallClock, wallClockNow } from "@/lib/dates";
import { localToday } from "@/lib/tours";
import { toast } from "@/lib/toast";
import { toastActionError } from "@/lib/action-toast";
import { formatDuration } from "@/lib/utils";
import type { Gig, Setlist } from "@/types/api";
import type { Tour } from "@/types/content";
import { TourCard } from "../../../tours/_components/tour-card";
import { TourDialog } from "../../../tours/_components/tour-dialog";
import { updateSuggestionThreshold } from "../actions";

/** Repertoire card: song count, what it is, a way in. */
export function RepertoireCard({ repertoire }: { repertoire: Setlist | null }) {
  const t = useTranslations("bands.page");
  const tRepertoire = useTranslations("setlists.repertoire");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Library className="text-primary h-5 w-5" aria-hidden />
          {tRepertoire("name")}
        </CardTitle>
        <CardDescription>{tRepertoire("explanation")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums">
            {repertoire?.song_count ?? 0}
          </span>
          <span className="text-muted-foreground text-sm">
            {t("repertoireSongs", { count: repertoire?.song_count ?? 0 })}
          </span>
        </div>
        {repertoire && (
          <Button asChild variant="outline" className="gap-2">
            <Link href={`/dashboard/setlists/${repertoire.id}`}>
              {t("openRepertoire")}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/** Setlists tab: repertoire first, compact rows, link to the full list. */
export function BandSetlistsSection({
  bandId,
  setlists,
}: {
  bandId: string;
  setlists: Setlist[];
}) {
  const t = useTranslations("bands.page");
  const tRepertoire = useTranslations("setlists.repertoire");
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>{t("setlistsTitle")}</CardTitle>
          <CardDescription>{t("setlistsDescription")}</CardDescription>
        </div>
        <Button asChild variant="outline" className="shrink-0 gap-2">
          <Link href={`/dashboard/bands/${bandId}/setlists`}>
            {t("manageSetlists")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {setlists.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noSetlists")}</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {setlists.map((setlist) => (
              <li
                key={setlist.id}
                className="flex items-center gap-3 px-3 py-2.5"
              >
                {setlist.is_repertoire ? (
                  <Library
                    className="text-primary h-4 w-4 shrink-0"
                    aria-hidden
                  />
                ) : (
                  <ListMusic
                    className="text-muted-foreground h-4 w-4 shrink-0"
                    aria-hidden
                  />
                )}
                <Link
                  href={`/dashboard/setlists/${setlist.id}`}
                  className="min-w-0 flex-1 truncate font-medium hover:underline"
                >
                  {setlist.is_repertoire ? tRepertoire("name") : setlist.title}
                </Link>
                {setlist.is_repertoire && (
                  <Badge variant="secondary">{tRepertoire("badge")}</Badge>
                )}
                <span className="text-muted-foreground hidden text-xs tabular-nums sm:inline">
                  {t("songCount", { count: setlist.song_count ?? 0 })}
                </span>
                <span className="text-muted-foreground inline-flex items-center gap-1 font-mono text-xs tabular-nums">
                  <Clock className="h-3 w-3" aria-hidden />
                  {formatDuration(setlist.total_duration)}
                </span>
                <PinButton
                  type="setlist"
                  id={setlist.id}
                  name={
                    setlist.is_repertoire ? tRepertoire("name") : setlist.title
                  }
                  pinned={!!setlist.is_pinned}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** Shows tab (and overview): upcoming gigs first. */
export function BandGigsSection({
  bandId,
  gigs,
  limit,
  compact = false,
}: {
  bandId: string;
  gigs: Gig[];
  limit?: number;
  compact?: boolean;
}) {
  const t = useTranslations("bands.page");
  const tStatus = useTranslations("gigs.dialog.status");
  const locale = useLocale();
  const mounted = useMounted();
  const now = mounted ? wallClockNow() : null;
  const at = (gig: Gig) => parseWallClock(gig.scheduled_at).getTime();
  const upcoming = gigs
    .filter((gig) => now === null || at(gig) >= now)
    .sort((a, b) => at(a) - at(b));
  const shown = limit ? upcoming.slice(0, limit) : upcoming;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" aria-hidden />
            {compact ? t("nextGigs") : t("gigsTitle")}
          </CardTitle>
          {!compact && (
            <CardDescription>{t("gigsDescription")}</CardDescription>
          )}
        </div>
        <Button asChild variant="outline" className="shrink-0 gap-2">
          <Link href={`/dashboard/bands/${bandId}/gigs`}>
            {t("allGigs")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {shown.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noUpcomingGigs")}</p>
        ) : (
          <ul className="space-y-2">
            {shown.map((gig) => (
              <li key={gig.id}>
                <Link
                  href={`/dashboard/gigs/${gig.id}`}
                  className="hover:bg-muted/50 flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors"
                >
                  <div className="bg-primary/10 text-primary flex w-12 shrink-0 flex-col items-center rounded-md py-1 leading-tight">
                    <span className="text-[10px] font-semibold uppercase">
                      {formatWallClock(gig.scheduled_at, locale, {
                        month: "short",
                      })}
                    </span>
                    <span className="text-lg font-bold">
                      {formatWallClock(gig.scheduled_at, locale, {
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{gig.venue}</p>
                    <p className="text-muted-foreground flex items-center gap-1 truncate text-xs">
                      {formatWallClock(gig.scheduled_at, locale, {
                        weekday: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {gig.location && (
                        <>
                          <MapPin className="ml-1 h-3 w-3" aria-hidden />
                          <span className="truncate">{gig.location}</span>
                        </>
                      )}
                    </p>
                  </div>
                  {gig.tour_name && (
                    <Badge
                      variant="secondary"
                      className="hidden gap-1 font-normal sm:inline-flex"
                    >
                      <Route aria-hidden />
                      {gig.tour_name}
                    </Badge>
                  )}
                  <Badge variant="outline">{tStatus(gig.status)}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** Tours tab. */
export function BandToursSection({
  bandId,
  tours,
  canManage,
  canCreate,
}: {
  bandId: string;
  tours: Tour[];
  canManage: boolean;
  canCreate: boolean;
}) {
  const t = useTranslations("bands.page");
  const tTours = useTranslations("tours");
  const mounted = useMounted();
  const [isCreating, setIsCreating] = useState(false);
  const today = mounted ? localToday() : "";
  const sorted = [...tours].sort((a, b) =>
    b.start_date.localeCompare(a.start_date),
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" aria-hidden />
            {tTours("title")}
          </CardTitle>
          <CardDescription>{t("toursDescription")}</CardDescription>
        </div>
        {canManage && (
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <Button
              onClick={() => setIsCreating(true)}
              disabled={!canCreate}
              className="gap-2"
            >
              <Plus className="h-4 w-4" aria-hidden />
              {tTours("newTour")}
            </Button>
            {!canCreate && <UpgradeHint message={tTours("locked")} />}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noTours")}</p>
        ) : (
          mounted && (
            <div className="grid gap-3 sm:grid-cols-2">
              {sorted.map((tour) => (
                <TourCard key={tour.id} tour={tour} today={today} />
              ))}
            </div>
          )
        )}
      </CardContent>
      <TourDialog
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        fixedBandId={bandId}
      />
    </Card>
  );
}

/** Settings: automatic acceptance of suggestions. */
export function SuggestionSettings({
  bandId,
  value,
}: {
  bandId: string;
  value: number | null;
}) {
  const t = useTranslations("bands.page");
  const [enabled, setEnabled] = useState(value !== null);
  const [votes, setVotes] = useState(String(value ?? 3));
  const [isPending, startTransition] = useTransition();
  const parsed = Number(votes);
  const valid = Number.isInteger(parsed) && parsed >= 1 && parsed <= 100;

  const save = () => {
    if (enabled && !valid) return;
    startTransition(async () => {
      const result = await updateSuggestionThreshold(
        bandId,
        enabled ? parsed : null,
      );
      if (result.success) toast.success(t("thresholdSaved"));
      else toastActionError(result, result.error);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("suggestionSettingsTitle")}</CardTitle>
        <CardDescription>{t("suggestionSettingsDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-center gap-3 text-sm">
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            disabled={isPending}
          />
          {t("autoAcceptLabel")}
        </label>
        {enabled && (
          <div className="max-w-xs space-y-2">
            <Label htmlFor="auto-accept-votes">{t("autoAcceptVotes")}</Label>
            <Input
              id="auto-accept-votes"
              type="number"
              inputMode="numeric"
              min={1}
              max={100}
              value={votes}
              onChange={(e) => setVotes(e.target.value)}
              aria-invalid={!valid}
              aria-describedby="auto-accept-hint"
              disabled={isPending}
            />
            <p
              id="auto-accept-hint"
              className={
                valid
                  ? "text-muted-foreground text-xs"
                  : "text-destructive text-xs"
              }
            >
              {valid
                ? t("autoAcceptHint", { votes: parsed })
                : t("autoAcceptInvalid")}
            </p>
          </div>
        )}
        <Button onClick={save} disabled={isPending || (enabled && !valid)}>
          {isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          )}
          {t("saveSettings")}
        </Button>
      </CardContent>
    </Card>
  );
}
