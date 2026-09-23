"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  CalendarDays,
  ChevronLeft,
  Clock,
  Guitar,
  Link2,
  ListMusic,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Unlink,
} from "lucide-react";
import { useAppRouter } from "@/hooks/use-app-router";
import { useMounted } from "@/hooks/use-mounted";
import { Link } from "@/components/nav-link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PinButton } from "@/components/content/pin-button";
import { toastMovedToTrash } from "@/components/content/trash-toast";
import { toast } from "@/lib/toast";
import { toastActionError } from "@/lib/action-toast";
import { formatWallClock } from "@/lib/dates";
import { localToday, tourLengthDays, tourPhase } from "@/lib/tours";
import { cn, formatDuration } from "@/lib/utils";
import type { Gig, GigStatus, Setlist } from "@/types/api";
import type { TourDetail } from "@/types/content";
import { updateGig } from "../../../gigs/actions";
import { GigDialog } from "../../../gigs/_components/gigs-dialog";
import { setlistDisplayTitle } from "@/lib/repertoire";
import { deleteTour } from "../../actions";
import { TourDialog } from "../../_components/tour-dialog";
import { PHASE_STYLES, formatTourDates } from "../../_components/tour-card";

const STATUS_STYLES: Record<GigStatus, string> = {
  confirmed: "border-primary/40 bg-primary/10 text-primary",
  completed:
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  cancelled: "border-destructive/40 bg-destructive/10 text-destructive",
};

interface TourDetailViewProps {
  tour: TourDetail;
  band: { id: string; name: string } | null;
  canManage: boolean;
  /** Same-scope gigs without a tour. */
  linkableGigs: Gig[];
  /** Same-scope setlists, for new gigs. */
  setlists: Setlist[];
}

export function TourDetailView({
  tour,
  band,
  canManage,
  linkableGigs,
  setlists,
}: TourDetailViewProps) {
  const t = useTranslations("tours");
  const tGigs = useTranslations("gigs.dialog");
  const tTrash = useTranslations("trash");
  const tCommon = useTranslations("common");
  const tRepertoire = useTranslations("setlists.repertoire");
  const locale = useLocale();
  const router = useAppRouter();
  const mounted = useMounted();

  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingGig, setIsAddingGig] = useState(false);
  const [gigSession, setGigSession] = useState(0);
  const [isLinking, setIsLinking] = useState(false);
  const [linkGigId, setLinkGigId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [pendingGig, setPendingGig] = useState<string | null>(null);

  const phase = mounted ? tourPhase(tour, localToday()) : null;
  const gigs = [...tour.gigs].sort((a, b) =>
    a.scheduled_at.localeCompare(b.scheduled_at),
  );

  const stats = [
    { label: t("stats.total"), value: tour.stats.total_gigs },
    { label: t("stats.confirmed"), value: tour.stats.confirmed },
    { label: t("stats.completed"), value: tour.stats.completed },
    { label: t("stats.cancelled"), value: tour.stats.cancelled },
    {
      label: t("stats.duration"),
      value: formatDuration(tour.stats.total_setlist_duration),
    },
  ];

  const confirmDelete = () => {
    startTransition(async () => {
      const result = await deleteTour(tour.id);
      if (!result.success) {
        toastActionError(result, result.error || t("deleteFailed"));
        return;
      }
      setIsDeleting(false);
      toastMovedToTrash(
        "tour",
        tour.id,
        {
          message: t("deleted"),
          undoLabel: tTrash("undo"),
          restored: t("restored"),
          restoreFailed: tTrash("restoreFailed"),
        },
        () => router.push(`/dashboard/tours/${tour.id}`),
      );
      router.push("/dashboard/tours");
    });
  };

  const linkGig = () => {
    if (!linkGigId) return;
    startTransition(async () => {
      const result = await updateGig(
        linkGigId,
        { tour_id: tour.id },
        tour.band_id ?? undefined,
      );
      if (result.success) {
        toast.success(t("gigLinked"));
        setIsLinking(false);
        setLinkGigId("");
      } else {
        toastActionError(result, result.error || t("linkFailed"));
      }
    });
  };

  const unlinkGig = (gigId: string) => {
    setPendingGig(gigId);
    startTransition(async () => {
      const result = await updateGig(
        gigId,
        { tour_id: null },
        tour.band_id ?? undefined,
      );
      setPendingGig(null);
      if (result.success) toast.success(t("gigUnlinked"));
      else toastActionError(result, result.error || t("linkFailed"));
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button
            variant="outline"
            size="icon"
            asChild
            className="shrink-0"
            aria-label={tCommon("back")}
          >
            <Link href="/dashboard/tours">
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight break-words sm:text-3xl">
                {tour.name}
              </h1>
              {phase && (
                <Badge variant="outline" className={PHASE_STYLES[phase]}>
                  {t(`phase.${phase}`)}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" aria-hidden />
                {formatTourDates(tour, locale)}
                <span className="text-muted-foreground/80">
                  ({t("days", { count: tourLengthDays(tour) })})
                </span>
              </span>
              {band && (
                <Link
                  href={`/dashboard/bands/${band.id}`}
                  className="inline-flex items-center gap-1.5 hover:underline"
                >
                  <Guitar className="h-4 w-4" aria-hidden />
                  {band.name}
                </Link>
              )}
            </p>
            {tour.description && (
              <p className="max-w-2xl text-sm whitespace-pre-wrap">
                {tour.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {canManage && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-4 w-4" aria-hidden />
              <span className="sr-only sm:not-sr-only">{tCommon("edit")}</span>
            </Button>
          )}
          <PinButton
            type="tour"
            id={tour.id}
            name={tour.name}
            pinned={!!tour.is_pinned}
            variant="default"
          />
          {canManage && (
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive gap-2"
              onClick={() => setIsDeleting(true)}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              <span className="sr-only sm:not-sr-only">
                {tCommon("delete")}
              </span>
            </Button>
          )}
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border p-3">
            <dt className="text-muted-foreground text-xs">{stat.label}</dt>
            <dd className="mt-1 text-xl font-bold tabular-nums">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="tour-gigs" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="tour-gigs" className="text-xl font-semibold">
            {t("gigsTitle")}
          </h2>
          {canManage && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setIsLinking(true)}
                disabled={linkableGigs.length === 0}
                title={linkableGigs.length === 0 ? t("noLinkable") : undefined}
              >
                <Link2 className="h-4 w-4" aria-hidden />
                {t("linkGig")}
              </Button>
              <Button
                className="gap-2"
                onClick={() => {
                  setGigSession((n) => n + 1);
                  setIsAddingGig(true);
                }}
              >
                <Plus className="h-4 w-4" aria-hidden />
                {t("addGig")}
              </Button>
            </div>
          )}
        </div>

        {gigs.length === 0 ? (
          <div className="bg-card flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-12 text-center">
            <CalendarDays
              className="text-muted-foreground h-8 w-8"
              aria-hidden
            />
            <p className="font-medium">{t("noGigs")}</p>
            <p className="text-muted-foreground max-w-md text-sm">
              {t("noGigsHint")}
            </p>
          </div>
        ) : (
          <ol className="relative space-y-3 border-l-2 pl-5 sm:ml-2">
            {gigs.map((gig) => (
              <li key={gig.id} className="relative">
                <span
                  className={cn(
                    "absolute top-5 -left-[27px] h-3 w-3 rounded-full border-2",
                    gig.status === "cancelled"
                      ? "border-destructive bg-background"
                      : gig.status === "completed"
                        ? "border-emerald-500 bg-emerald-500"
                        : "border-primary bg-background",
                  )}
                  aria-hidden
                />
                <article className="bg-card flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                      {formatWallClock(gig.scheduled_at, locale, {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <h3 className="font-semibold">
                      <Link
                        href={`/dashboard/gigs/${gig.id}`}
                        className="hover:underline"
                      >
                        {gig.venue}
                      </Link>
                    </h3>
                    {gig.location && (
                      <p className="text-muted-foreground flex items-center gap-1 text-sm">
                        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        <span className="truncate">{gig.location}</span>
                      </p>
                    )}
                    {gig.setlist ? (
                      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                        <Link
                          href={`/dashboard/setlists/${gig.setlist.id}`}
                          className="text-primary inline-flex items-center gap-1.5 font-medium hover:underline"
                        >
                          <ListMusic className="h-4 w-4" aria-hidden />
                          {setlistDisplayTitle(
                            gig.setlist,
                            tRepertoire("name"),
                          )}
                        </Link>
                        <span className="text-muted-foreground">
                          {t("setlistSummary", {
                            count: gig.setlist.song_count,
                          })}
                        </span>
                        <span className="text-muted-foreground inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" aria-hidden />
                          {formatDuration(gig.setlist.total_duration)}
                        </span>
                      </p>
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        {t("noSetlist")}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge
                      variant="outline"
                      className={STATUS_STYLES[gig.status]}
                    >
                      {tGigs(`status.${gig.status}`)}
                    </Badge>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => unlinkGig(gig.id)}
                        disabled={isPending}
                        aria-label={t("unlinkNamed", { venue: gig.venue })}
                        title={t("unlink")}
                      >
                        {pendingGig === gig.id ? (
                          <Loader2
                            className="h-4 w-4 animate-spin"
                            aria-hidden
                          />
                        ) : (
                          <Unlink className="h-4 w-4" aria-hidden />
                        )}
                      </Button>
                    )}
                  </div>
                </article>
              </li>
            ))}
          </ol>
        )}
      </section>

      <TourDialog
        tour={tour}
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
      />

      <GigDialog
        key={`gig-${gigSession}`}
        isOpen={isAddingGig}
        onClose={() => setIsAddingGig(false)}
        personalSetlists={tour.band_id ? [] : setlists}
        bands={band ? [{ id: band.id, name: band.name, setlists }] : []}
        fixedBandId={band?.id}
        tours={[{ id: tour.id, name: tour.name, band_id: tour.band_id }]}
        initialTourId={tour.id}
      />

      <Dialog open={isLinking} onOpenChange={setIsLinking}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("linkTitle")}</DialogTitle>
            <DialogDescription>{t("linkDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="link-gig">{t("linkLabel")}</Label>
            <NativeSelect
              id="link-gig"
              value={linkGigId}
              onChange={(e) => setLinkGigId(e.target.value)}
              disabled={isPending}
            >
              <option value="" disabled>
                {t("linkPlaceholder")}
              </option>
              {linkableGigs.map((gig) => (
                <option key={gig.id} value={gig.id}>
                  {formatWallClock(gig.scheduled_at, locale, {
                    dateStyle: "short",
                  })}{" "}
                  · {gig.venue}
                </option>
              ))}
            </NativeSelect>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsLinking(false)}
              disabled={isPending}
            >
              {tCommon("cancel")}
            </Button>
            <Button onClick={linkGig} disabled={isPending || !linkGigId}>
              {isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              )}
              {t("linkButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("deleteConfirm", { name: tour.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setIsDeleting(false)}
              disabled={isPending}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isPending}
            >
              {isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              )}
              {t("moveToTrash")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
