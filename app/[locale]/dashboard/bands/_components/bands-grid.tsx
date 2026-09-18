"use client";

import { useMemo, useState, useTransition } from "react";
import { BandWithMembership } from "@/types/api";
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
  Pencil,
  Plus,
  Trash2,
  LogOut,
  Users,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/routing";
import { useSession } from "next-auth/react";

interface BandsGridProps {
  initialBands: BandWithMembership[];
}

export function BandsGrid({ initialBands }: BandsGridProps) {
  const t = useTranslations("bands");
  const tCommon = useTranslations("common");
  const { data: session } = useSession();

  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
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
    if (!search.trim()) return initialBands;
    const term = search.toLowerCase();
    return initialBands.filter(
      (band) =>
        band.name.toLowerCase().includes(term) ||
        band.description?.toLowerCase().includes(term),
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
        toast.error(result.error);
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
        toast.error(result.error);
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
      toast.error(result.error);
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
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          {t("addBand")}
        </Button>
      </div>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder={t("searchPlaceholder")}
        className="max-w-sm"
      />

      {bands.length === 0 ? (
        <Card className="text-muted-foreground flex flex-col items-center justify-center gap-2 px-4 py-16 text-center">
          <Users className="h-8 w-8" />
          <p>{search ? t("emptySearch", { search }) : t("empty")}</p>
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
                  className="text-muted-foreground absolute top-3 right-3 hover:text-yellow-500 disabled:opacity-50"
                  title={band.is_favorite ? t("unfavorite") : t("favorite")}
                >
                  <Star
                    className={cn(
                      "h-4 w-4",
                      band.is_favorite && "fill-yellow-400 text-yellow-500",
                    )}
                  />
                </button>

                <Link
                  href={`/dashboard/bands/${band.id}`}
                  className="flex items-start gap-3"
                >
                  <BandAvatar name={band.name} logoUrl={band.logo_url} />
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
                        className="h-8 w-8 p-0"
                        data-no-row-click
                      >
                        <MoreHorizontal className="h-4 w-4" />
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
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t("menu.delete")}
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => setBandToLeave(band)}
                          className="text-red-600"
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

      <Dialog
        open={!!bandToDelete}
        onOpenChange={(open) => !open && setBandToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tCommon("delete")}</DialogTitle>
            <DialogDescription>
              {t("dialog.deleteConfirm", { name: bandToDelete?.name ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setBandToDelete(null)}
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

      <Dialog
        open={!!bandToLeave}
        onOpenChange={(open) => !open && setBandToLeave(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dialog.leaveTitle")}</DialogTitle>
            <DialogDescription>
              {t("dialog.leaveConfirm", { name: bandToLeave?.name ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setBandToLeave(null)}
              disabled={isPending}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmLeave}
              disabled={isPending}
            >
              {t("menu.leave")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
