"use client";

import { useMemo, useState, useTransition } from "react";
import { useAppRouter } from "@/hooks/use-app-router";
import { Gig, GigStatus, Setlist } from "@/types/api";
import { deleteGig } from "../actions";
import { GigDialog, BandOption, TourOption } from "./gigs-dialog";
import { PinButton } from "@/components/content/pin-button";
import { Route, X } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { LoadErrorNotice } from "@/components/load-error-notice";
import { useOfflineGigs } from "@/hooks/use-offline-library";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  ChevronRight,
  Guitar,
  Calendar,
} from "lucide-react";
import { toastActionError } from "@/lib/action-toast";
import { toastMovedToTrash } from "@/components/content/trash-toast";
import { cn } from "@/lib/utils";
import { formatWallClock, parseWallClock, wallClockNow } from "@/lib/dates";
import { useMounted } from "@/hooks/use-mounted";
import { Link } from "@/components/nav-link";
import { useOfflineDisabled } from "@/components/offline-disabled";

interface BandLookupEntry {
  name: string;
  canManage: boolean;
}

interface GigsTableProps {
  initialGigs: Gig[];
  bandsById: Record<string, BandLookupEntry>;
  personalSetlists: Setlist[];
  bands: BandOption[];
  /** Locks the "new/edit gig" dialog to a single band's scope (e.g. when
   * rendered from that band's own gigs page). */
  fixedBandId?: string;
  /**
   * True when the page's server-side fetch failed rather than genuinely
   * returning zero shows. Shows a retrying state instead of the "no shows
   * yet" empty state so a transient failure never looks like an empty
   * account. See components/load-error-notice.tsx.
   */
  loadError?: boolean;
  /** Tours offered in the gig dialog. */
  tours?: TourOption[];
  /** Only gigs of this tour (`?tour_id=`), with a way to clear it. */
  tourFilter?: { id: string; name: string } | null;
}

const STATUS_VARIANT: Record<
  GigStatus,
  "default" | "destructive" | "secondary"
> = {
  confirmed: "default",
  cancelled: "destructive",
  completed: "secondary",
};

export function GigsTable({
  initialGigs,
  bandsById,
  personalSetlists,
  bands,
  fixedBandId,
  loadError,
  tours = [],
  tourFilter = null,
}: GigsTableProps) {
  const router = useAppRouter();
  const offlineDisabled = useOfflineDisabled();
  const t = useTranslations("gigs");
  const tCommon = useTranslations("common");
  const tTrash = useTranslations("trash");
  const locale = useLocale();

  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGig, setEditingGig] = useState<Gig | null>(null);
  // Part of the dialog's key: every open starts from the gig's saved
  // values (or a blank form), never from a previous gig's state.
  const [dialogSession, setDialogSession] = useState(0);
  const [gigToDelete, setGigToDelete] = useState<Gig | null>(null);

  // See hooks/use-offline-records.ts: with no connection, or when this
  // page's fetch failed, the shows come from the on-device mirror.
  const { records: availableGigs, isFromCache } = useOfflineGigs({
    fallback: initialGigs,
    loadError,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const inTour = tourFilter
      ? availableGigs.filter((gig) => gig.tour_id === tourFilter.id)
      : availableGigs;
    if (!q) return inTour;
    return inTour.filter((gig) => {
      const bandName = gig.band_id ? bandsById[gig.band_id]?.name : "";
      return (
        gig.venue.toLowerCase().includes(q) ||
        (gig.notes ?? "").toLowerCase().includes(q) ||
        (bandName ?? "").toLowerCase().includes(q) ||
        (gig.tour_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [availableGigs, search, bandsById, tourFilter]);

  // "Upcoming" depends on the viewer's clock, which the server doesn't
  // share: split only after mount (before that, one list in date order).
  const mounted = useMounted();
  const [clientNow] = useState(() =>
    typeof window === "undefined" ? 0 : wallClockNow(),
  );
  const now = mounted ? clientNow : null;

  const { upcoming, past } = useMemo(() => {
    const at = (gig: Gig) => parseWallClock(gig.scheduled_at).getTime();
    const upcoming = filtered
      .filter((g) => now === null || at(g) >= now)
      .sort((a, b) => at(a) - at(b));
    const past = filtered
      .filter((g) => now !== null && at(g) < now)
      .sort((a, b) => at(b) - at(a));
    return { upcoming, past };
  }, [filtered, now]);

  const handleOpenDialog = (gig?: Gig) => {
    setEditingGig(gig ?? null);
    setDialogSession((n) => n + 1);
    setIsDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!gigToDelete) return;
    startTransition(async () => {
      const result = await deleteGig(
        gigToDelete.id,
        gigToDelete.band_id ?? undefined,
      );
      if (result.success) {
        toastMovedToTrash("gig", gigToDelete.id, {
          message: t("dialog.deleted"),
          undoLabel: tTrash("undo"),
          restored: t("dialog.restored"),
          restoreFailed: tTrash("restoreFailed"),
        });
      } else {
        toastActionError(result, result.error);
      }
      setGigToDelete(null);
    });
  };

  const formatDateTime = (value: string) => formatWallClock(value, locale);

  const renderRow = (gig: Gig) => {
    const bandInfo = gig.band_id ? bandsById[gig.band_id] : undefined;
    const isBandGig = !!gig.band_id;
    const canManage = !isBandGig || bandInfo?.canManage === true;

    return (
      <TableRow
        key={gig.id}
        className="group cursor-pointer"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("[data-no-row-click]")) return;
          router.push(`/dashboard/gigs/${gig.id}`);
        }}
      >
        <TableCell>
          <div className="flex items-center gap-2">
            <MapPin className="text-muted-foreground h-4 w-4 shrink-0" />
            <Link
              href={`/dashboard/gigs/${gig.id}`}
              data-no-row-click
              className="focus-visible:ring-ring rounded-sm font-medium group-hover:underline focus-visible:ring-2 focus-visible:outline-none"
            >
              {gig.venue}
            </Link>
            {isBandGig && (
              <Badge
                variant="outline"
                className="gap-1 text-xs font-normal"
                title={t("bandGigTooltip", { name: bandInfo?.name ?? "" })}
              >
                <Guitar className="h-3 w-3" />
                {bandInfo?.name ?? t("bandGig")}
              </Badge>
            )}
            {gig.tour_id && gig.tour_name && (
              <Badge
                variant="secondary"
                className="gap-1 text-xs font-normal"
                asChild
              >
                <Link
                  href={`/dashboard/tours/${gig.tour_id}`}
                  data-no-row-click
                >
                  <Route className="h-3 w-3" aria-hidden />
                  {gig.tour_name}
                </Link>
              </Badge>
            )}
            <ChevronRight className="text-muted-foreground h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground text-sm">
          {formatDateTime(gig.scheduled_at)}
        </TableCell>
        <TableCell>
          <Badge variant={STATUS_VARIANT[gig.status]}>
            {t(`dialog.status.${gig.status}`)}
          </Badge>
        </TableCell>
        <TableCell className="text-right" data-no-row-click>
          <div className="flex items-center justify-end gap-0.5">
            <PinButton
              type="gig"
              id={gig.id}
              name={gig.venue}
              pinned={!!gig.is_pinned}
              className="hidden sm:inline-flex"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={(e) => e.stopPropagation()}
                  aria-label={tCommon("moreActionsFor", { name: gig.venue })}
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" data-no-row-click>
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/gigs/${gig.id}`}>
                    <Calendar className="mr-2 h-4 w-4" />
                    {t("menu.viewDetails")}
                  </Link>
                </DropdownMenuItem>
                {canManage && (
                  <>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDialog(gig);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      {t("menu.edit")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setGigToDelete(gig);
                      }}
                      variant="destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t("menu.delete")}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={() => handleOpenDialog()} {...offlineDisabled}>
          <Plus className="mr-2 h-4 w-4" />
          {t("addGig")}
        </Button>
      </div>

      {tourFilter && (
        <div className="bg-primary/5 border-primary/30 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm">
          <Route className="text-primary h-4 w-4" aria-hidden />
          <span>{t("tourFilter", { name: tourFilter.name })}</span>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="ml-auto h-7 gap-1"
          >
            <Link href="/dashboard/gigs">
              <X className="h-3.5 w-3.5" aria-hidden />
              {t("clearTourFilter")}
            </Link>
          </Button>
        </div>
      )}

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder={t("searchPlaceholder")}
        className="max-w-sm"
      />

      <div
        className={cn(
          "bg-card rounded-md border",
          isPending && "pointer-events-none opacity-60",
        )}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.venue")}</TableHead>
              <TableHead>{t("table.when")}</TableHead>
              <TableHead>{t("table.status")}</TableHead>
              <TableHead className="w-12 text-right">
                {t("table.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  {loadError && !isFromCache ? (
                    <LoadErrorNotice />
                  ) : (
                    <span className="text-muted-foreground">
                      {search ? t("emptySearch", { search }) : t("empty")}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              <>
                {upcoming.length > 0 && now !== null && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={4}
                      className="text-muted-foreground bg-muted/30 py-2 text-xs font-semibold tracking-wide uppercase"
                    >
                      {t("upcoming")}
                    </TableCell>
                  </TableRow>
                )}
                {upcoming.map(renderRow)}

                {past.length > 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={4}
                      className="text-muted-foreground bg-muted/30 py-2 text-xs font-semibold tracking-wide uppercase"
                    >
                      {t("past")}
                    </TableCell>
                  </TableRow>
                )}
                {past.map(renderRow)}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-muted-foreground text-sm">
        {tCommon("showing", {
          count: filtered.length,
          total: availableGigs.length,
          entity:
            availableGigs.length !== 1 ? tCommon("results") : tCommon("result"),
        })}
        {search && ` ${tCommon("showingFor", { search })}`}
      </p>

      <GigDialog
        key={`${editingGig?.id ?? "new"}:${dialogSession}`}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        gig={editingGig}
        personalSetlists={personalSetlists}
        bands={bands}
        fixedBandId={
          fixedBandId ??
          (editingGig ? (editingGig.band_id ?? undefined) : undefined)
        }
        tours={tours}
        initialTourId={tourFilter?.id}
      />

      <Dialog
        open={!!gigToDelete}
        onOpenChange={(open) => !open && setGigToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dialog.deleteTitle")}</DialogTitle>
            <DialogDescription>{t("dialog.deleteConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setGigToDelete(null)}
              disabled={isPending}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isPending}
            >
              {tCommon("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
