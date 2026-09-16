"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Gig, GigStatus, Setlist } from "@/types/api";
import { deleteGig } from "../actions";
import { GigDialog, BandOption } from "./gigs-dialog";
import { SearchInput } from "@/components/ui/search-input";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/routing";

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
}: GigsTableProps) {
  const router = useRouter();
  const t = useTranslations("gigs");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGig, setEditingGig] = useState<Gig | null>(null);
  const [gigToDelete, setGigToDelete] = useState<Gig | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initialGigs;
    return initialGigs.filter((gig) => {
      const bandName = gig.band_id ? bandsById[gig.band_id]?.name : "";
      return (
        gig.venue.toLowerCase().includes(q) ||
        (gig.notes ?? "").toLowerCase().includes(q) ||
        (bandName ?? "").toLowerCase().includes(q)
      );
    });
  }, [initialGigs, search, bandsById]);

  const [now] = useState(() => Date.now());

  const { upcoming, past } = useMemo(() => {
    const upcoming = filtered
      .filter((g) => new Date(g.scheduled_at).getTime() >= now)
      .sort(
        (a, b) =>
          new Date(a.scheduled_at).getTime() -
          new Date(b.scheduled_at).getTime(),
      );
    const past = filtered
      .filter((g) => new Date(g.scheduled_at).getTime() < now)
      .sort(
        (a, b) =>
          new Date(b.scheduled_at).getTime() -
          new Date(a.scheduled_at).getTime(),
      );
    return { upcoming, past };
  }, [filtered, now]);

  const handleOpenDialog = (gig?: Gig) => {
    setEditingGig(gig ?? null);
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
        toast.success(t("dialog.deleted"));
      } else {
        toast.error(result.error);
      }
      setGigToDelete(null);
    });
  };

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    });

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
            <span className="font-medium group-hover:underline">
              {gig.venue}
            </span>
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("menu.delete")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          {t("addGig")}
        </Button>
      </div>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder={t("searchPlaceholder")}
        className="max-w-sm"
      />

      <div
        className={cn(
          "bg-background rounded-md border",
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
                <TableCell
                  colSpan={4}
                  className="text-muted-foreground h-24 text-center"
                >
                  {search ? t("emptySearch", { search }) : t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              <>
                {upcoming.length > 0 && (
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
          total: initialGigs.length,
          entity:
            initialGigs.length !== 1 ? tCommon("results") : tCommon("result"),
        })}
        {search && ` ${tCommon("showingFor", { search })}`}
      </p>

      <GigDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        gig={editingGig}
        personalSetlists={personalSetlists}
        bands={bands}
        fixedBandId={
          fixedBandId ??
          (editingGig ? (editingGig.band_id ?? undefined) : undefined)
        }
      />

      <Dialog
        open={!!gigToDelete}
        onOpenChange={(open) => !open && setGigToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tCommon("delete")}</DialogTitle>
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
