"use client";

import { PageHeader } from "@/components/page-header";
import { useMemo, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useSyncSearchParams } from "@/hooks/use-url-state";
import { BandWithMembership, QuotaReport } from "@/types/api";
import {
  deleteBand,
  leaveBand,
  favoriteBand,
  unfavoriteBand,
} from "../actions";
import { BandDialog } from "./band-dialog";
import { BandAvatar } from "@/components/bands/band-avatar";
import { BandRoleBadge } from "@/components/bands/band-role-badge";
import { SearchInput } from "@/components/ui/search-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadErrorNotice } from "@/components/load-error-notice";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  QuotaChip,
  QuotaLimitNotice,
  quotaState,
  quotaUsageOf,
} from "@/components/quota-usage-list";
import { useOfflineDisabled } from "@/components/offline-disabled";
import { foldForSearch } from "@/lib/search";
import {
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  LogOut,
  Users,
  Star,
  SearchX,
  CalendarDays,
  Vote,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { toastActionError } from "@/lib/action-toast";
import { cn } from "@/lib/utils";
import { PinButton } from "@/components/content/pin-button";
import { Link } from "@/components/nav-link";
import { useSession } from "next-auth/react";
import { useMounted } from "@/hooks/use-mounted";
import { formatWallClock, parseWallClock, wallClockNow } from "@/lib/dates";

/** A band show, as much as its card says about it. */
export interface BandGigPreview {
  id: string;
  venue: string;
  scheduled_at: string;
}

/** The first of a band's shows still ahead on the viewer's clock. */
function nextGigOf(
  gigs: BandGigPreview[] | undefined,
  now: number | null,
): BandGigPreview | null {
  if (!gigs || now === null) return null;
  return (
    gigs.find((gig) => parseWallClock(gig.scheduled_at).getTime() >= now) ??
    null
  );
}

/** "today", "tomorrow", "in 5 days": calendar days, not 24-hour spans. */
function relativeDay(value: string, now: number, locale: string): string {
  const day = (time: number) => Math.floor(time / 86_400_000);
  const diff = day(parseWallClock(value).getTime()) - day(now);
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
    diff,
    "day",
  );
}

interface BandsGridProps {
  initialBands: BandWithMembership[];
  /**
   * True when the page's server-side fetch failed rather than genuinely
   * returning zero bands. Shows a retrying state instead of the "no bands
   * yet" empty state so a transient failure never looks like an empty
   * account. See components/load-error-notice.tsx.
   */
  loadError?: boolean;
  /** `GET /users/me/quotas`, for the usage chip next to "New band". */
  quotas?: QuotaReport | null;
  /**
   * Each band's shows that may still be ahead, soonest first (see the
   * page). A band missing here had its shows fail to load.
   */
  upcomingGigs?: Record<string, BandGigPreview[]>;
}

export function BandsGrid({
  initialBands,
  loadError,
  quotas = null,
  upcomingGigs = {},
}: BandsGridProps) {
  const t = useTranslations("bands");
  const tCommon = useTranslations("common");
  const tApi = useTranslations("apiErrors");
  const tDanger = useTranslations("bands.danger");
  const [deleteName, setDeleteName] = useState("");
  const offlineDisabled = useOfflineDisabled();
  const quota = quotaUsageOf(quotas, "bands_owned");
  const quotaFull = quotaState(quota).full;
  const { data: session } = useSession();
  const locale = useLocale();
  // "Next show" depends on the viewer's clock: only after mount.
  const mounted = useMounted();
  const [clientNow] = useState(() =>
    typeof window === "undefined" ? 0 : wallClockNow(),
  );
  const now = mounted ? clientNow : null;

  const [isPending, startTransition] = useTransition();
  // In the URL (`?q=`), so Back from a band returns to the same search.
  const initialSearch = useSearchParams()?.get("q") ?? "";
  const [search, setSearch] = useState(initialSearch);
  useSyncSearchParams({ q: search.trim() || null });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBand, setEditingBand] = useState<BandWithMembership | null>(
    null,
  );
  const [bandToDelete, setBandToDelete] = useState<BandWithMembership | null>(
    null,
  );
  const [bandToLeave, setBandToLeave] = useState<BandWithMembership | null>(
    null,
  );
  const [favoritePendingId, setFavoritePendingId] = useState<string | null>(
    null,
  );

  const bands = useMemo(() => {
    const term = foldForSearch(search.trim());
    if (!term) return initialBands;
    return initialBands.filter((band) =>
      [band.name, band.description].some((value) =>
        foldForSearch(value ?? "").includes(term),
      ),
    );
  }, [initialBands, search]);

  const handleOpenDialog = (band?: BandWithMembership) => {
    setEditingBand(band ?? null);
    setIsDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!bandToDelete) return;
    startTransition(async () => {
      const result = await deleteBand(bandToDelete.id);
      if (!result.success) {
        // The dialog stays open so the person can retry or cancel.
        toastActionError(result, result.error);
        return;
      }
      toast.success(t("dialog.deleted"));
      setBandToDelete(null);
      setDeleteName("");
    });
  };

  const confirmLeave = () => {
    if (!bandToLeave || !session?.user?.id) return;
    startTransition(async () => {
      const result = await leaveBand(bandToLeave.id, session.user.id);
      if (!result.success) {
        // The dialog stays open so the person can retry or cancel.
        toastActionError(result, result.error);
        return;
      }
      toast.success(t("dialog.left"));
      setBandToLeave(null);
    });
  };

  const handleToggleFavorite = async (band: BandWithMembership) => {
    setFavoritePendingId(band.id);
    try {
      const result = band.is_favorite
        ? await unfavoriteBand(band.id)
        : await favoriteBand(band.id);
      if (!result.success) {
        toastActionError(result, result.error);
      }
    } catch {
      toast.error(tApi("generic"));
    } finally {
      setFavoritePendingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <>
            <QuotaChip usage={quota} resource="bands_owned" />
            <Button
              onClick={() => handleOpenDialog()}
              {...offlineDisabled}
              disabled={offlineDisabled.disabled || quotaFull}
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              {t("addBand")}
            </Button>
          </>
        }
      />
      <QuotaLimitNotice
        usage={quota}
        resource="bands_owned"
        className="-mt-3"
      />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder={t("searchPlaceholder")}
        className="max-w-sm"
      />

      {bands.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 px-4 py-6 text-center">
          {loadError ? (
            <LoadErrorNotice />
          ) : search ? (
            <EmptyState
              compact
              icon={SearchX}
              title={t("emptySearch", { search })}
              actions={
                <Button variant="outline" onClick={() => setSearch("")}>
                  {tCommon("clearSearch")}
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Users}
              title={t("emptyState.title")}
              description={t("emptyState.description")}
              actions={
                <Button
                  onClick={() => handleOpenDialog()}
                  {...offlineDisabled}
                  disabled={offlineDisabled.disabled || quotaFull}
                >
                  <Plus className="mr-2 h-4 w-4" aria-hidden />
                  {t("addBand")}
                </Button>
              }
            />
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bands.map((band) => {
            const canManage =
              band.my_role === "owner" || band.my_role === "admin";

            const nextGig = nextGigOf(upcomingGigs[band.id], now);
            const openSuggestions = band.open_suggestions ?? 0;

            return (
              <Card
                key={band.id}
                className="hover:border-primary/40 relative gap-3 pb-0 transition-colors"
              >
                <div className="flex items-start gap-3 px-4">
                  <BandAvatar
                    bandId={band.id}
                    name={band.name}
                    logoUrl={band.logo_url}
                    className="h-11 w-11"
                  />
                  <div className="min-w-0 flex-1 pt-0.5">
                    <h2 className="truncate text-base font-semibold">
                      {/* Stretched over the whole card: the card is the
                          way into the band, not just its name. The
                          buttons on it sit above the link (z-10). */}
                      <Link
                        href={`/dashboard/bands/${band.id}`}
                        title={band.name}
                        className="focus-visible:ring-ring/50 rounded-sm outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:ring-3"
                      >
                        {band.name}
                      </Link>
                    </h2>
                    <p className="text-muted-foreground truncate text-xs">
                      {t("memberCount", { count: band.member_count })}
                    </p>
                  </div>
                  <div className="relative z-10 -mt-1 -mr-2 flex shrink-0 items-center">
                    <PinButton
                      type="band"
                      id={band.id}
                      name={band.name}
                      pinned={!!band.is_pinned}
                    />
                    <button
                      type="button"
                      data-no-row-click
                      onClick={() => handleToggleFavorite(band)}
                      disabled={
                        offlineDisabled.disabled ||
                        favoritePendingId === band.id
                      }
                      className="text-muted-foreground focus-visible:ring-ring/50 flex size-8 items-center justify-center rounded-md outline-none hover:text-yellow-500 focus-visible:ring-3 disabled:opacity-50 pointer-coarse:size-10"
                      // Offline, the tooltip says why it's off instead.
                      title={
                        offlineDisabled.title ??
                        (band.is_favorite ? t("unfavorite") : t("favorite"))
                      }
                      aria-label={t("favoriteNamed", { name: band.name })}
                      aria-pressed={!!band.is_favorite}
                    >
                      <Star
                        aria-hidden
                        className={cn(
                          "h-4 w-4",
                          band.is_favorite && "fill-yellow-400 text-yellow-500",
                        )}
                      />
                    </button>
                  </div>
                </div>

                {band.description && (
                  <p className="text-muted-foreground line-clamp-2 px-4 text-sm">
                    {band.description}
                  </p>
                )}

                {/* When the band plays next: what a member opens the
                    bands page to find out. Hidden until the viewer's clock
                    is known, and when the band's shows couldn't load. */}
                {now !== null && band.id in upcomingGigs && (
                  <div className="bg-muted/50 mx-4 flex min-w-0 items-center gap-3 rounded-lg px-3 py-2">
                    <CalendarDays
                      className={cn(
                        "h-4 w-4 shrink-0",
                        nextGig ? "text-primary" : "text-muted-foreground",
                      )}
                      aria-hidden
                    />
                    {nextGig ? (
                      <div className="min-w-0 flex-1 text-xs">
                        <p className="text-muted-foreground">
                          {t("card.nextGig")}
                        </p>
                        <p className="truncate text-sm font-medium">
                          {nextGig.venue}
                        </p>
                        <p className="text-muted-foreground truncate">
                          {formatWallClock(nextGig.scheduled_at, locale, {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          <span aria-hidden> · </span>
                          {relativeDay(nextGig.scheduled_at, now, locale)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-xs">
                        {t("card.noUpcoming")}
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-auto flex items-center justify-between gap-2 border-t px-4 py-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <BandRoleBadge role={band.my_role} />
                    {openSuggestions > 0 && (
                      <Link
                        href={`/dashboard/bands/${band.id}?tab=suggestions`}
                        className="text-primary focus-visible:ring-ring/50 relative z-10 inline-flex items-center gap-1 rounded-sm text-xs font-medium outline-none hover:underline focus-visible:ring-3"
                      >
                        <Vote className="h-3.5 w-3.5" aria-hidden />
                        {t("card.openSuggestions", { count: openSuggestions })}
                      </Link>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        data-no-row-click
                        className="relative z-10 -mr-2"
                        aria-label={tCommon("moreActionsFor", {
                          name: band.name,
                        })}
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" data-no-row-click>
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/bands/${band.id}`}>
                          <Users className="mr-2 h-4 w-4" />
                          {t("menu.manage")}
                        </Link>
                      </DropdownMenuItem>
                      {canManage && (
                        <DropdownMenuItem
                          onClick={() => handleOpenDialog(band)}
                          disabled={offlineDisabled.disabled}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          {t("menu.edit")}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      {band.my_role === "owner" ? (
                        <DropdownMenuItem
                          onClick={() => setBandToDelete(band)}
                          variant="destructive"
                          disabled={offlineDisabled.disabled}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t("menu.delete")}
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => setBandToLeave(band)}
                          variant="destructive"
                          disabled={offlineDisabled.disabled}
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          {t("menu.leave")}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <BandDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        band={editingBand}
      />

      {/* The same safeguard as the band's danger zone: deleting a band
          has no trash to come back from, so its name is typed first. */}
      <ConfirmActionDialog
        open={!!bandToDelete}
        onOpenChange={(open) => {
          if (open) return;
          setBandToDelete(null);
          setDeleteName("");
        }}
        title={t("dialog.deleteTitle")}
        description={t("dialog.deleteConfirm", {
          name: bandToDelete?.name ?? "",
        })}
        confirmLabel={tCommon("delete")}
        onConfirm={confirmDelete}
        pending={isPending}
        confirmDisabled={
          !bandToDelete || deleteName.trim() !== bandToDelete.name.trim()
        }
      >
        <div className="space-y-2">
          <Label htmlFor="grid-delete-band-name">
            {tDanger("typeToConfirm", { name: bandToDelete?.name ?? "" })}
          </Label>
          <Input
            id="grid-delete-band-name"
            value={deleteName}
            onChange={(e) => setDeleteName(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            disabled={isPending}
          />
        </div>
      </ConfirmActionDialog>

      <ConfirmActionDialog
        open={!!bandToLeave}
        onOpenChange={(open) => !open && setBandToLeave(null)}
        title={t("dialog.leaveTitle")}
        description={t("dialog.leaveConfirm", {
          name: bandToLeave?.name ?? "",
        })}
        confirmLabel={t("menu.leave")}
        onConfirm={confirmLeave}
        pending={isPending}
      />
    </div>
  );
}
