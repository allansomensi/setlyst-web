"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlarmClock,
  Loader2,
  Pencil,
  Pin,
  Plus,
  StickyNote,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/user-avatar";
import { useMounted } from "@/hooks/use-mounted";
import { toast } from "@/lib/toast";
import { toastActionError } from "@/lib/action-toast";
import { FieldError } from "@/components/ui/field-error";
import { DiscardChangesDialog } from "@/components/ui/discard-changes-dialog";
import { useDialogCloseGuard } from "@/hooks/use-dialog-close-guard";
import { fieldA11y } from "@/lib/forms";
import { formatWallClock, parseWallClock, wallClockNow } from "@/lib/dates";
import { cn } from "@/lib/utils";
import {
  BAND_NOTE_COLORS,
  type BandNote,
  type BandNoteColor,
} from "@/types/content";
import {
  createBandNote,
  deleteBandNote,
  updateBandNote,
  type BandNoteInput,
} from "../actions";

const MAX_LENGTH = 2000;

/**
 * Sticky-note colours. Light tints with dark text in the light theme,
 * deep tints with light text in the dark one: both stay well above 4.5:1.
 */
const NOTE_STYLES: Record<BandNoteColor, { card: string; swatch: string }> = {
  default: {
    card: "bg-card text-card-foreground border-border",
    swatch: "bg-card border-border",
  },
  yellow: {
    card: "bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/60 dark:text-amber-50 dark:border-amber-800",
    swatch: "bg-amber-200 border-amber-400 dark:bg-amber-800",
  },
  green: {
    card: "bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-50 dark:border-emerald-800",
    swatch: "bg-emerald-200 border-emerald-400 dark:bg-emerald-800",
  },
  blue: {
    card: "bg-sky-100 text-sky-950 border-sky-300 dark:bg-sky-950/60 dark:text-sky-50 dark:border-sky-800",
    swatch: "bg-sky-200 border-sky-400 dark:bg-sky-800",
  },
  red: {
    card: "bg-rose-100 text-rose-950 border-rose-300 dark:bg-rose-950/60 dark:text-rose-50 dark:border-rose-800",
    swatch: "bg-rose-200 border-rose-400 dark:bg-rose-800",
  },
  purple: {
    card: "bg-violet-100 text-violet-950 border-violet-300 dark:bg-violet-950/60 dark:text-violet-50 dark:border-violet-800",
    swatch: "bg-violet-200 border-violet-400 dark:bg-violet-800",
  },
};

interface BandNotesProps {
  bandId: string;
  notes: BandNote[];
  /** Moderators and above may pin. */
  canPin: boolean;
}

/** "Lembretes": short notes for the whole band, pinned ones first. */
export function BandNotes({ bandId, notes, canPin }: BandNotesProps) {
  const t = useTranslations("bandNotes");
  const locale = useLocale();
  const mounted = useMounted();
  const [editing, setEditing] = useState<BandNote | "new" | null>(null);
  const [toDelete, setToDelete] = useState<BandNote | null>(null);
  const [isPending, startTransition] = useTransition();
  const now = mounted ? wallClockNow() : null;

  const confirmDelete = () => {
    if (!toDelete) return;
    startTransition(async () => {
      const result = await deleteBandNote(bandId, toDelete.id);
      if (result.success) {
        toast.success(t("deleted"));
        setToDelete(null);
      } else {
        toastActionError(result, result.error);
      }
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5" aria-hidden />
            {t("title")}
          </CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </div>
        <Button onClick={() => setEditing("new")} className="shrink-0 gap-2">
          <Plus className="h-4 w-4" aria-hidden />
          <span className="sr-only sm:not-sr-only">{t("add")}</span>
        </Button>
      </CardHeader>
      <CardContent>
        {notes.length === 0 ? (
          <div className="text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
            {t("empty")}
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {notes.map((note) => {
              const overdue =
                !!note.due_at &&
                now !== null &&
                parseWallClock(note.due_at).getTime() < now;
              return (
                <li
                  key={note.id}
                  className={cn(
                    "flex flex-col gap-3 rounded-lg border p-3 shadow-xs",
                    NOTE_STYLES[note.color].card,
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {note.is_pinned && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium">
                          <Pin
                            className="h-3.5 w-3.5 fill-current"
                            aria-hidden
                          />
                          {t("pinned")}
                        </span>
                      )}
                      {note.due_at && (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                            overdue
                              ? "border-red-700 bg-red-700 text-white dark:border-red-400 dark:bg-red-400 dark:text-red-950"
                              : "border-current/30",
                          )}
                        >
                          <AlarmClock className="h-3 w-3" aria-hidden />
                          {overdue ? t("overdue") : t("due")}{" "}
                          {formatWallClock(note.due_at, locale, {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                    {note.can_edit && (
                      <div className="-mt-1 -mr-1 flex">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 hover:bg-black/10 dark:hover:bg-white/10"
                          onClick={() => setEditing(note)}
                          aria-label={t("edit")}
                          title={t("edit")}
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 hover:bg-black/10 dark:hover:bg-white/10"
                          onClick={() => setToDelete(note)}
                          aria-label={t("delete")}
                          title={t("delete")}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </Button>
                      </div>
                    )}
                  </div>
                  <p className="text-sm break-words whitespace-pre-wrap">
                    {note.content}
                  </p>
                  <div className="mt-auto flex items-center gap-2 text-xs opacity-80">
                    {note.author && (
                      <UserAvatar
                        userId={note.author.id}
                        name={note.author.username}
                        avatarUrl={note.author.avatar_url}
                        size="xs"
                      />
                    )}
                    <span className="truncate">
                      {note.author
                        ? `@${note.author.username}`
                        : t("unknownAuthor")}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <NoteDialog
        key={editing === "new" ? "new" : (editing?.id ?? "closed")}
        bandId={bandId}
        note={editing}
        canPin={canPin}
        onClose={() => setEditing(null)}
      />

      <Dialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteTitle")}</DialogTitle>
            <DialogDescription>{t("deleteConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setToDelete(null)}
              disabled={isPending}
            >
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isPending}
            >
              {isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              )}
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function NoteDialog({
  bandId,
  note,
  canPin,
  onClose,
}: {
  bandId: string;
  note: BandNote | "new" | null;
  canPin: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("bandNotes");
  const existing = note && note !== "new" ? note : null;
  const [initialForm] = useState<BandNoteInput>(() => ({
    content: existing?.content ?? "",
    color: existing?.color ?? "yellow",
    is_pinned: existing?.is_pinned ?? false,
    due_at: existing?.due_at ? existing.due_at.slice(0, 16) : "",
  }));
  const [form, setForm] = useState<BandNoteInput>(initialForm);
  const [contentError, setContentError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm);
  const closeGuard = useDialogCloseGuard({ isDirty, isPending, onClose });

  const submit = () => {
    if (isPending) return;
    if (!form.content.trim()) {
      setContentError(t("contentRequired"));
      document.getElementById("note-content")?.focus();
      return;
    }
    setContentError(null);
    startTransition(async () => {
      const result = existing
        ? await updateBandNote(bandId, existing.id, {
            ...form,
            ...(canPin ? {} : { is_pinned: undefined }),
          })
        : await createBandNote(bandId, {
            ...form,
            is_pinned: canPin && form.is_pinned,
          });
      if (result.success) {
        toast.success(existing ? t("updated") : t("created"));
        onClose();
      } else {
        toastActionError(result, result.error || t("saveFailed"));
      }
    });
  };

  return (
    <>
      <Dialog open={!!note} onOpenChange={closeGuard.onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {existing ? t("editTitle") : t("addTitle")}
            </DialogTitle>
            <DialogDescription>{t("dialogDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="note-content">{t("contentLabel")}</Label>
              <Textarea
                id="note-content"
                value={form.content}
                onChange={(e) => {
                  setForm({ ...form, content: e.target.value });
                  if (contentError) setContentError(null);
                }}
                maxLength={MAX_LENGTH}
                rows={5}
                placeholder={t("contentPlaceholder")}
                disabled={isPending}
                aria-required
                {...fieldA11y("note-content", contentError, "note-count")}
              />
              <FieldError fieldId="note-content" message={contentError} />
              <p
                id="note-count"
                className="text-muted-foreground text-right text-xs tabular-nums"
              >
                {t("count", { count: form.content.length, max: MAX_LENGTH })}
              </p>
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">{t("colorLabel")}</legend>
              <div
                role="radiogroup"
                aria-label={t("colorLabel")}
                className="flex flex-wrap gap-2"
              >
                {BAND_NOTE_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    role="radio"
                    aria-checked={form.color === color}
                    aria-label={t(`colors.${color}`)}
                    title={t(`colors.${color}`)}
                    onClick={() => setForm({ ...form, color })}
                    className={cn(
                      "focus-visible:ring-ring/50 h-8 w-8 rounded-full border-2 transition-transform focus-visible:ring-3 focus-visible:outline-none",
                      NOTE_STYLES[color].swatch,
                      form.color === color
                        ? "ring-foreground ring-offset-background scale-110 ring-2 ring-offset-2"
                        : "hover:scale-105",
                    )}
                  />
                ))}
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="note-due">{t("dueLabel")}</Label>
                <Input
                  id="note-due"
                  type="datetime-local"
                  value={form.due_at}
                  onChange={(e) => setForm({ ...form, due_at: e.target.value })}
                  disabled={isPending}
                />
              </div>
              {canPin && (
                <label className="flex items-center gap-3 self-end rounded-lg border px-3 py-2 text-sm">
                  <Switch
                    checked={form.is_pinned}
                    onCheckedChange={(value) =>
                      setForm({ ...form, is_pinned: value })
                    }
                    disabled={isPending}
                  />
                  {t("pinLabel")}
                </label>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeGuard.requestClose}
              disabled={isPending}
            >
              {t("cancel")}
            </Button>
            <Button onClick={submit} disabled={isPending}>
              {isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              )}
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DiscardChangesDialog {...closeGuard.discard} />
    </>
  );
}
