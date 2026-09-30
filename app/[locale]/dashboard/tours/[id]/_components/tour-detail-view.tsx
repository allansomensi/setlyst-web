"use client";

import { StatGrid } from "@/components/stat-grid";
import { GigStatusBadge } from "@/components/content/gig-status-badge";
import { Fragment, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  CalendarDays,
  Clock,
  FileJson,
  Guitar,
  Link2,
  ListMusic,
  Loader2,
  MapPin,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  Unlink,
} from "lucide-react";
import { useAppRouter } from "@/hooks/use-app-router";
import { useMounted } from "@/hooks/use-mounted";
import { useSharedFileExport } from "@/hooks/use-shared-file-export";
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
import { DetailBackButton, DetailHeader } from "@/components/detail-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toastMovedToTrash } from "@/components/content/trash-toast";
import { toast } from "@/lib/toast";
import { toastActionError } from "@/lib/action-toast";
import { formatWallClock, parseWallClock, wallClockNow } from "@/lib/dates";
import { localToday, tourLengthDays, tourPhase } from "@/lib/tours";
import { cn, formatDuration } from "@/lib/utils";
import type { Gig, Setlist } from "@/types/api";
import type { TourDetail } from "@/types/content";
import { updateGig } from "../../../gigs/actions";
import { GigDialog } from "../../../gigs/_components/gigs-dialog";
import { setlistDisplayTitle } from "@/lib/repertoire";
import { deleteTour } from "../../actions";
import { TourDialog } from "../../_components/tour-dialog";
import { PHASE_STYLES, formatTourDates } from "../../_components/tour-card";

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
  const tFiles = useTranslations("sharedFiles");
  // The tour with its gigs, setlists and songs, for someone else to import.
  const { exporting, exportFile } = useSharedFileExport("tour", tour.id);
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
  // "You are here" on a tour under way: the first show still ahead, on
  // the viewer's clock (so only after mount). Drawn only between shows,
  // where it says something the dates alone don't at a glance.
  const nowMs = mounted ? wallClockNow() : null;
  const nextIndex =
    nowMs === null
      ? -1
      : gigs.findIndex(
          (gig) => parseWallClock(gig.scheduled_at).getTime() >= nowMs,
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
          restoring: tTrash("restoring"),
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
      {/* Edit and pin in reach; exporting and deleting, rarer (and one of
          them destructive), behind the menu, as on a show's page. A red
          "Delete" used to sit in the header next to "Edit". */}
      <DetailHeader
        actions={
          <>
            {canManage && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setIsEditing(true)}
                title={tCommon("edit")}
              >
                <Pencil className="h-4 w-4" aria-hidden />
                <span className="sr-only sm:not-sr-only">
                  {tCommon("edit")}
                </span>
              </Button>
            )}
            <PinButton
              type="tour"
              id={tour.id}
              name={tour.name}
              pinned={!!tour.is_pinned}
              variant="default"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={tCommon("moreActions")}
                  title={tCommon("moreActions")}
                >
                  {exporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <MoreVertical className="h-4 w-4" aria-hidden />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuItem
                  className="items-start"
                  onSelect={() => void exportFile()}
                  disabled={exporting}
                >
                  <FileJson className="mt-0.5 mr-2 h-4 w-4 shrink-0" />
                  <span className="min-w-0">
                    <span className="block">{tFiles("exportFile")}</span>
                    <span className="text-muted-foreground block text-xs">
                      {tFiles("exportHint.tour")}
                    </span>
                  </span>
                </DropdownMenuItem>
                {canManage && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setIsDeleting(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {tCommon("delete")}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      >
        <DetailBackButton
          href={
            band ? `/dashboard/bands/${band.id}?tab=tours` : "/dashboard/tours"
          }
          label={band ? band.name : t("title")}
        />
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
      </DetailHeader>

      <StatGrid items={stats} />

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
          <div className="bg-card rounded-xl border border-dashed">
            <EmptyState
              icon={CalendarDays}
              title={t("noGigs")}
              description={canManage ? t("noGigsHint") : undefined}
              actions={
                canManage ? (
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
                ) : undefined
              }
            />
          </div>
        ) : (
          <ol className="relative space-y-3 border-l-2 pl-5 sm:ml-2">
            {gigs.map((gig, index) => (
              <Fragment key={gig.id}>
                {index === nextIndex && index > 0 && (
                  <li className="relative flex items-center gap-2">
                    <span
                      className="bg-primary ring-primary/20 absolute top-1/2 -left-[27px] h-3 w-3 -translate-y-1/2 rounded-full ring-4"
                      aria-hidden
                    />
                    <span className="text-primary text-xs font-semibold tracking-wide uppercase">
                      {t("today")}
                    </span>
                    <span className="bg-primary/30 h-px flex-1" aria-hidden />
                  </li>
                )}
                <li className="relative">
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
                      <h3 className="font-semibold break-words">
                        <Link
                          href={`/dashboard/gigs/${gig.id}`}
                          className="hover:underline"
                        >
                          {gig.venue}
                        </Link>
                      </h3>
                      {gig.location && (
                        <p className="text-muted-foreground flex items-center gap-1 text-sm">
                          <MapPin
                            className="h-3.5 w-3.5 shrink-0"
                            aria-hidden
                          />
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
                      <GigStatusBadge
                        status={gig.status}
                        label={tGigs(`status.${gig.status}`)}
                      />
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
              </Fragment>
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

      <ConfirmActionDialog
        open={isDeleting}
        onOpenChange={setIsDeleting}
        title={t("deleteTitle")}
        description={t("deleteConfirm", { name: tour.name })}
        confirmLabel={t("moveToTrash")}
        onConfirm={confirmDelete}
        pending={isPending}
      />
    </div>
  );
}
