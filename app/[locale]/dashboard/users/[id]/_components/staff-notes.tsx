"use client";

import { useState, useTransition } from "react";
import { Loader2, Pencil, Pin, PinOff, StickyNote, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ClientDate } from "@/components/client-date";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toastActionError } from "@/lib/action-toast";
import type { StaffActor } from "@/lib/staff-permissions";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { STAFF_NOTE_MAX, type UserStaffNote } from "@/types/operations";
import { createUserNote, deleteUserNote, updateUserNote } from "../../actions";

const DATE_OPTIONS = { dateStyle: "medium", timeStyle: "short" } as const;

/**
 * Internal notes about an account, for the staff only (the person never
 * sees them): context for the next moderator ("warned about spam on
 * 12/09"). Pinned notes come first. Anyone on the staff can add one; only
 * its author or an admin can edit, pin or delete it.
 */
export function StaffNotes({
  userId,
  notes,
  actor,
}: {
  userId: string;
  /** Null when they couldn't be loaded. */
  notes: UserStaffNote[] | null;
  actor: StaffActor;
}) {
  const t = useTranslations("userNotes");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<UserStaffNote | null>(null);
  const [isAdding, startAdding] = useTransition();
  const [isPending, startTransition] = useTransition();

  const canEdit = (note: UserStaffNote) =>
    actor.role === "admin" || note.author_id === actor.id;

  const add = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!body.trim() || isAdding) return;
    startAdding(async () => {
      const result = await createUserNote(userId, body, pinned);
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      toast.success(t("added"));
      setBody("");
      setPinned(false);
    });
  };

  const togglePin = (note: UserStaffNote) =>
    startTransition(async () => {
      const result = await updateUserNote(userId, note.id, {
        pinned: !note.pinned,
      });
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      toast.success(note.pinned ? t("unpinned") : t("pinnedDone"));
    });

  const confirmDelete = () => {
    if (!toDelete) return;
    const note = toDelete;
    startTransition(async () => {
      const result = await deleteUserNote(userId, note.id);
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      toast.success(t("deleted"));
      setToDelete(null);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StickyNote className="text-muted-foreground size-4" aria-hidden />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={add} className="space-y-2">
          <Label htmlFor="staff-note-body" className="sr-only">
            {t("newLabel")}
          </Label>
          <Textarea
            id="staff-note-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={STAFF_NOTE_MAX}
            rows={3}
            placeholder={t("placeholder")}
            disabled={isAdding}
            aria-describedby="staff-note-count"
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={pinned}
                onCheckedChange={(value) => setPinned(value === true)}
                disabled={isAdding}
              />
              {t("pinOnAdd")}
            </label>
            <span
              id="staff-note-count"
              className="text-muted-foreground ml-auto text-xs tabular-nums"
            >
              {t("count", { count: body.length, max: STAFF_NOTE_MAX })}
            </span>
            <Button type="submit" size="sm" disabled={isAdding || !body.trim()}>
              {isAdding && <Loader2 className="animate-spin" aria-hidden />}
              {t("add")}
            </Button>
          </div>
        </form>

        {notes === null ? (
          <p className="text-muted-foreground text-sm">{t("loadFailed")}</p>
        ) : notes.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-sm">
            {t("empty")}
          </p>
        ) : (
          <ul className="space-y-3">
            {notes.map((note) =>
              note.id === editingId ? (
                <li key={note.id}>
                  <NoteEditor
                    userId={userId}
                    note={note}
                    onDone={() => setEditingId(null)}
                  />
                </li>
              ) : (
                <li
                  key={note.id}
                  className={cn(
                    "rounded-lg border p-3",
                    note.pinned &&
                      "border-amber-500/40 bg-amber-500/5 dark:border-amber-400/30",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-muted-foreground min-w-0 text-xs">
                      {note.pinned && (
                        <span className="text-foreground mr-2 inline-flex items-center gap-1 font-medium">
                          <Pin className="size-3 fill-current" aria-hidden />
                          {t("pinned")}
                        </span>
                      )}
                      <span className="font-medium">
                        {note.author_username
                          ? `@${note.author_username}`
                          : t("unknownAuthor")}
                      </span>
                      {" · "}
                      <ClientDate
                        value={note.created_at}
                        options={DATE_OPTIONS}
                      />
                      {note.updated_at !== note.created_at && (
                        <> · {t("edited")}</>
                      )}
                    </p>
                    {canEdit(note) && (
                      <div className="-mt-1 -mr-1 flex shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => togglePin(note)}
                          disabled={isPending}
                          aria-label={note.pinned ? t("unpin") : t("pin")}
                          title={note.pinned ? t("unpin") : t("pin")}
                        >
                          {note.pinned ? (
                            <PinOff className="size-3.5" aria-hidden />
                          ) : (
                            <Pin className="size-3.5" aria-hidden />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => setEditingId(note.id)}
                          disabled={isPending}
                          aria-label={t("edit")}
                          title={t("edit")}
                        >
                          <Pencil className="size-3.5" aria-hidden />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => setToDelete(note)}
                          disabled={isPending}
                          aria-label={t("delete")}
                          title={t("delete")}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </Button>
                      </div>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm break-words whitespace-pre-wrap">
                    {note.body}
                  </p>
                </li>
              ),
            )}
          </ul>
        )}
      </CardContent>

      <ConfirmActionDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={t("deleteTitle")}
        description={t("deleteDescription")}
        confirmLabel={t("delete")}
        onConfirm={confirmDelete}
        pending={isPending}
      />
    </Card>
  );
}

/** A note's text being edited in place. */
function NoteEditor({
  userId,
  note,
  onDone,
}: {
  userId: string;
  note: UserStaffNote;
  onDone: () => void;
}) {
  const t = useTranslations("userNotes");
  const tCommon = useTranslations("common");
  const [body, setBody] = useState(note.body);
  const [isPending, startTransition] = useTransition();
  const id = `staff-note-${note.id}`;

  const save = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!body.trim() || isPending) return;
    if (body.trim() === note.body) {
      onDone();
      return;
    }
    startTransition(async () => {
      const result = await updateUserNote(userId, note.id, { body });
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      toast.success(t("updated"));
      onDone();
    });
  };

  return (
    <form onSubmit={save} className="space-y-2 rounded-lg border p-3">
      <Label htmlFor={id} className="sr-only">
        {t("editLabel")}
      </Label>
      <Textarea
        id={id}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && !isPending) onDone();
        }}
        maxLength={STAFF_NOTE_MAX}
        rows={4}
        disabled={isPending}
        aria-describedby={`${id}-count`}
        autoFocus
      />
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span
          id={`${id}-count`}
          className="text-muted-foreground mr-auto text-xs tabular-nums"
        >
          {t("count", { count: body.length, max: STAFF_NOTE_MAX })}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDone}
          disabled={isPending}
        >
          {tCommon("cancel")}
        </Button>
        <Button type="submit" size="sm" disabled={isPending || !body.trim()}>
          {isPending && <Loader2 className="animate-spin" aria-hidden />}
          {tCommon("save")}
        </Button>
      </div>
    </form>
  );
}
