"use client";

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
import { LoadErrorNotice } from "@/components/load-error-notice";
import { useTranslations } from "next-intl";
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
} from "lucide-react";
import { toast } from "@/lib/toast";
import { toastActionError } from "@/lib/action-toast";
import { cn } from "@/lib/utils";
import { PinButton } from "@/components/content/pin-button";
import { Link } from "@/components/nav-link";
import { useSession } from "next-auth/react";

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
}

export function BandsGrid({
  initialBands,
  loadError,
  quotas = null,
}: BandsGridProps) {
  const t = useTranslations("bands");
  const tCommon = useTranslations("common");
  const offlineDisabled = useOfflineDisabled();
  const quota = quotaUsageOf(quotas, "bands_owned");
  const quotaFull = quotaState(quota).full;
  const { data: session } = useSession();

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
      if (result.success) {
        toast.success(t("dialog.deleted"));
      } else {
        toastActionError(result, result.error);
      }
      setBandToDelete(null);
    });
  };

  const confirmLeave = () => {
    if (!bandToLeave || !session?.user?.id) return;
    startTransition(async () => {
      const result = await leaveBand(bandToLeave.id, session.user.id);
      if (result.success) {
        toast.success(t("dialog.left"));
      } else {
        toastActionError(result, result.error);
      }
      setBandToLeave(null);
    });
  };

  const handleToggleFavorite = async (band: BandWithMembership) => {
    setFavoritePendingId(band.id);
    const result = band.is_favorite
      ? await unfavoriteBand(band.id)
      : await favoriteBand(band.id);
    if (!result.success) {
      toastActionError(result, result.error);
    }
    setFavoritePendingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <QuotaChip usage={quota} resource="bands_owned" />
          <Button
            onClick={() => handleOpenDialog()}
            {...offlineDisabled}
            disabled={offlineDisabled.disabled || quotaFull}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            {t("addBand")}
          </Button>
        </div>
      </div>
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

            return (
              <Card
                key={band.id}
                className="hover:border-primary/40 relative px-4 transition-colors"
              >
                <button
                  type="button"
                  data-no-row-click
                  onClick={() => handleToggleFavorite(band)}
                  disabled={favoritePendingId === band.id}
                  className="text-muted-foreground focus-visible:ring-ring/50 absolute top-1.5 right-1.5 flex size-8 items-center justify-center rounded-md outline-none hover:text-yellow-500 focus-visible:ring-3 disabled:opacity-50 pointer-coarse:size-10"
                  title={band.is_favorite ? t("unfavorite") : t("favorite")}
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
                <PinButton
                  type="band"
                  id={band.id}
                  name={band.name}
                  pinned={!!band.is_pinned}
                  className="absolute top-1.5 right-10 pointer-coarse:right-12"
                />

                <Link
                  href={`/dashboard/bands/${band.id}`}
                  className="flex items-start gap-3"
                >
                  <BandAvatar
                    bandId={band.id}
                    name={band.name}
                    logoUrl={band.logo_url}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{band.name}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {t("memberCount", { count: band.member_count })}
                    </p>
                  </div>
                </Link>

                {band.description && (
                  <p className="text-muted-foreground line-clamp-2 text-sm">
                    {band.description}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <BandRoleBadge role={band.my_role} />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        data-no-row-click
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
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t("menu.delete")}
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => setBandToLeave(band)}
                          variant="destructive"
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

      <ConfirmActionDialog
        open={!!bandToDelete}
        onOpenChange={(open) => !open && setBandToDelete(null)}
        title={tCommon("delete")}
        description={t("dialog.deleteConfirm", {
          name: bandToDelete?.name ?? "",
        })}
        confirmLabel={tCommon("delete")}
        onConfirm={confirmDelete}
        pending={isPending}
      />

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
