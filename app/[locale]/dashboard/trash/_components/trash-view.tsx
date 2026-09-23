"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatWallClock } from "@/lib/dates";
import {
  ArchiveRestore,
  Calendar,
  Disc3,
  ListMusic,
  Loader2,
  Music,
  Route,
  Trash2,
  User,
  type LucideIcon,
} from "lucide-react";
import { useAppRouter } from "@/hooks/use-app-router";
import { usePathname } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BandAvatar } from "@/components/bands/band-avatar";
import { ClientDate } from "@/components/client-date";
import { LoadErrorNotice } from "@/components/load-error-notice";
import { toast } from "@/lib/toast";
import { toastActionError } from "@/lib/action-toast";
import {
  deleteTrashItem,
  emptyTrash,
  restoreTrashItem,
} from "@/lib/actions/trash";
import { cn } from "@/lib/utils";
import type { PaginationMeta } from "@/types/api";
import { TRASH_TYPES, type TrashItem, type TrashType } from "@/types/content";

const TYPE_ICONS: Record<TrashType, LucideIcon> = {
  song: Music,
  artist: Disc3,
  setlist: ListMusic,
  gig: Calendar,
  tour: Route,
};

interface TrashViewProps {
  bands: Array<{ id: string; name: string; logoUrl: string | null }>;
  bandId: string | null;
  type: TrashType | null;
  page: number;
  items: TrashItem[];
  meta: PaginationMeta | null;
  loadError: boolean;
}

/**
 * The trash: deleted songs, artists, setlists, shows and tours, kept for
 * 30 days. One tab for the personal trash and one per band the person
 * manages; restore, delete for good, or empty everything.
 */
export function TrashView({
  bands,
  bandId,
  type,
  page,
  items,
  meta,
  loadError,
}: TrashViewProps) {
  const t = useTranslations("trash");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useAppRouter();
  const pathname = usePathname();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<TrashItem | null>(null);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [isPending, startTransition] = useTransition();

  const total = meta?.total_items ?? items.length;

  const go = (next: {
    band?: string | null;
    type?: TrashType | null;
    page?: number;
  }) => {
    const params = new URLSearchParams();
    const band = next.band === undefined ? bandId : next.band;
    const kind = next.type === undefined ? type : next.type;
    if (band) params.set("band", band);
    if (kind) params.set("type", kind);
    if (next.page && next.page > 1) params.set("page", String(next.page));
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const restore = (item: TrashItem) => {
    setPendingKey(`${item.type}:${item.id}`);
    startTransition(async () => {
      const result = await restoreTrashItem(item.type, item.id);
      setPendingKey(null);
      if (result.success) {
        toast.success(t("restored", { title: item.title }));
      } else {
        toastActionError(result, result.error || t("restoreFailed"));
      }
    });
  };

  const deleteForever = () => {
    if (!toDelete) return;
    const item = toDelete;
    startTransition(async () => {
      const result = await deleteTrashItem(item.type, item.id);
      if (result.success) {
        toast.success(t("deletedForever", { title: item.title }));
        setToDelete(null);
      } else {
        toastActionError(result, result.error || t("deleteFailed"));
      }
    });
  };

  const empty = () => {
    startTransition(async () => {
      const result = await emptyTrash(bandId ?? undefined);
      if (result.success) {
        toast.success(t("emptied", { count: result.data?.deleted ?? 0 }));
        setConfirmEmpty(false);
        if (page > 1) go({ page: 1 });
      } else {
        toastActionError(result, result.error || t("emptyFailed"));
      }
    });
  };

  // "pessoal" / "da banda X", used inside sentences.
  const scopeName = bandId
    ? t("scopeBand", { name: bands.find((b) => b.id === bandId)?.name ?? "" })
    : t("scopePersonal");

  return (
    <div className="w-full space-y-6 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1 max-w-xl">
            {t("retention")}
          </p>
        </div>
        <Button
          variant="outline"
          className="text-destructive hover:text-destructive gap-2"
          onClick={() => setConfirmEmpty(true)}
          disabled={total === 0 || isPending}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          {t("empty")}
        </Button>
      </div>

      <nav aria-label={t("scopes")} className="flex flex-wrap gap-2">
        <ScopeLink
          active={!bandId}
          onClick={() => go({ band: null, page: 1 })}
          icon={<User className="h-4 w-4" aria-hidden />}
          label={t("personal")}
        />
        {bands.map((band) => (
          <ScopeLink
            key={band.id}
            active={bandId === band.id}
            onClick={() => go({ band: band.id, page: 1 })}
            icon={
              <BandAvatar
                bandId={band.id}
                name={band.name}
                logoUrl={band.logoUrl}
                className="h-5 w-5 text-[9px]"
              />
            }
            label={band.name}
          />
        ))}
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="trash-type">{t("typeFilter")}</Label>
          <NativeSelect
            id="trash-type"
            value={type ?? ""}
            onChange={(e) =>
              go({
                type: (e.target.value || null) as TrashType | null,
                page: 1,
              })
            }
            wrapperClassName="w-52"
          >
            <option value="">{t("allTypes")}</option>
            {TRASH_TYPES.map((kind) => (
              <option key={kind} value={kind}>
                {t(`types.${kind}`)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {t("count", { count: total })}
        </p>
      </div>

      {loadError ? (
        <LoadErrorNotice />
      ) : items.length === 0 ? (
        <div className="bg-card flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-14 text-center">
          <Trash2 className="text-muted-foreground h-8 w-8" aria-hidden />
          <p className="font-medium">
            {type ? t("emptyFiltered") : t("emptyTitle", { scope: scopeName })}
          </p>
          <p className="text-muted-foreground max-w-md text-sm">
            {t("emptyHint")}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const Icon = TYPE_ICONS[item.type];
            const key = `${item.type}:${item.id}`;
            return (
              <li
                key={key}
                className="bg-card flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center"
              >
                <span className="bg-muted text-muted-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{item.title}</p>
                    <Badge variant="outline" className="font-normal">
                      {t(`types.${item.type}`)}
                    </Badge>
                    {item.batch_count > 0 && (
                      <Badge variant="secondary" className="font-normal">
                        {t("batch", { count: item.batch_count })}
                      </Badge>
                    )}
                  </div>
                  {item.subtitle && (
                    <p className="text-muted-foreground truncate text-sm">
                      {formatSubtitle(item, locale)}
                    </p>
                  )}
                  <p className="text-muted-foreground text-xs">
                    {item.deleted_by_username
                      ? t("deletedBy", { user: item.deleted_by_username })
                      : t("deletedByUnknown")}{" "}
                    <ClientDate
                      value={item.deleted_at}
                      options={{ dateStyle: "medium", timeStyle: "short" }}
                    />
                    {" · "}
                    <span className="text-foreground/80">
                      {t("purgeOn")} <ClientDate value={item.purge_at} />
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => restore(item)}
                    disabled={isPending}
                    aria-label={t("restoreNamed", { title: item.title })}
                  >
                    {pendingKey === key ? (
                      <Loader2
                        className="h-3.5 w-3.5 animate-spin"
                        aria-hidden
                      />
                    ) : (
                      <ArchiveRestore className="h-3.5 w-3.5" aria-hidden />
                    )}
                    {t("restore")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive gap-1.5"
                    onClick={() => setToDelete(item)}
                    disabled={isPending}
                    aria-label={t("deleteNamed", { title: item.title })}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    <span className="sr-only sm:not-sr-only">
                      {t("deleteForever")}
                    </span>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {meta && meta.total_pages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => go({ page: page - 1 })}
          >
            {tCommon("previous")}
          </Button>
          <span className="text-muted-foreground text-sm">
            {tCommon("pageOf", { page, total: meta.total_pages })}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.total_pages}
            onClick={() => go({ page: page + 1 })}
          >
            {tCommon("next")}
          </Button>
        </div>
      )}

      <Dialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("deleteConfirm", { title: toDelete?.title ?? "" })}
              {toDelete && toDelete.batch_count > 0 && (
                <> {t("deleteBatch", { count: toDelete.batch_count })}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setToDelete(null)}
              disabled={isPending}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={deleteForever}
              disabled={isPending}
            >
              {isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              )}
              {t("deleteForever")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmEmpty} onOpenChange={setConfirmEmpty}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("emptyConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {type
                ? t("emptyConfirmAll", { scope: scopeName })
                : t("emptyConfirm", { count: total, scope: scopeName })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setConfirmEmpty(false)}
              disabled={isPending}
            >
              {tCommon("cancel")}
            </Button>
            <Button variant="destructive" onClick={empty} disabled={isPending}>
              {isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              )}
              {type ? t("empty") : t("emptyButton", { count: total })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ScopeLink({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "focus-visible:ring-ring/50 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:ring-3 focus-visible:outline-none",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card hover:bg-muted",
      )}
    >
      {icon}
      <span className="max-w-40 truncate">{label}</span>
    </button>
  );
}

/**
 * The API sends gig and tour subtitles with ISO dates
 * ("2026-10-03 21:00, Recife", "2026-10-01..2026-10-20"): show them in
 * the person's language.
 */
function formatSubtitle(item: TrashItem, locale: string): string {
  const subtitle = item.subtitle ?? "";
  if (item.type === "gig") {
    const match = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})(?:, (.*))?$/.exec(
      subtitle,
    );
    if (match) {
      const when = formatWallClock(`${match[1]}T${match[2]}:00`, locale);
      return match[3] ? `${when} · ${match[3]}` : when;
    }
  }
  if (item.type === "tour") {
    const match = /^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/.exec(subtitle);
    if (match) {
      const day = (value: string) =>
        formatWallClock(`${value}T00:00:00`, locale, { dateStyle: "medium" });
      return `${day(match[1])} – ${day(match[2])}`;
    }
  }
  return subtitle;
}
