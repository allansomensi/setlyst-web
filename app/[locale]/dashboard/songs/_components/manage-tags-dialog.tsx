"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Loader2, Pencil, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TagChip } from "@/components/tags/tag-chip";
import { toastActionError } from "@/lib/action-toast";
import { MAX_TAG_LENGTH, normalizeTag, tagIssue } from "@/lib/tags";
import type { TagCount } from "@/types/api";
import { deleteSongTag, listSongTags, renameSongTag } from "../actions";

/**
 * The account's tag vocabulary: rename (renaming onto an existing tag
 * merges the two) or remove a tag from every song at once.
 */
export function ManageTagsDialog({
  open,
  onOpenChange,
  onTagChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * A tag was renamed (`to` = its new name) or removed (`to` = null), so
   * the page can follow an active filter on it instead of dropping every
   * filter whenever this dialog closes.
   */
  onTagChanged?: (from: string, to: string | null) => void;
}) {
  const t = useTranslations("tags.manage");
  const tTags = useTranslations("tags");
  const tCommon = useTranslations("common");
  const [tags, setTags] = useState<TagCount[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listSongTags()
      .then((result) => {
        if (cancelled) return;
        if (result.success) setTags(result.data ?? []);
        else {
          setTags([]);
          toastActionError(result, result.error);
        }
      })
      .catch(() => {
        // The request itself failed (offline): an empty list, not a
        // spinner that never ends.
        if (!cancelled) setTags([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Every open starts clean: fresh list, nothing half-edited or pending.
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setEditing(null);
      setDraft("");
      setConfirmDelete(null);
      setTags(null);
    }
    onOpenChange(next);
  };

  const normalizedDraft = normalizeTag(draft);
  const draftIssue = normalizedDraft ? tagIssue(normalizedDraft) : "characters";
  // An empty field just can't be saved; only a real problem gets a message.
  const visibleIssue = normalizedDraft ? draftIssue : null;

  const rename = (tag: string) => {
    if (!normalizedDraft || draftIssue || normalizedDraft === tag) {
      setEditing(null);
      return;
    }
    startTransition(async () => {
      const result = await renameSongTag(tag, normalizedDraft);
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      setTags((current) => {
        if (!current) return current;
        const renamed = current.find((c) => c.tag === tag);
        const merged = current
          .filter((c) => c.tag !== tag)
          .map((c) =>
            c.tag === normalizedDraft
              ? { ...c, song_count: c.song_count + (renamed?.song_count ?? 0) }
              : c,
          );
        if (!merged.some((c) => c.tag === normalizedDraft) && renamed) {
          merged.push({ tag: normalizedDraft, song_count: renamed.song_count });
        }
        return merged.sort((a, b) => b.song_count - a.song_count);
      });
      toast.success(t("renamed", { from: tag, to: normalizedDraft }));
      onTagChanged?.(tag, normalizedDraft);
      setEditing(null);
    });
  };

  const remove = (tag: string) => {
    startTransition(async () => {
      const result = await deleteSongTag(tag);
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      setTags((current) => current?.filter((c) => c.tag !== tag) ?? null);
      toast.success(t("deleted", { tag }));
      onTagChanged?.(tag, null);
      setConfirmDelete(null);
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {tags === null ? (
          <div role="status" className="flex justify-center py-6">
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
            <span className="sr-only">{tCommon("loading")}</span>
          </div>
        ) : tags.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            {t("empty")}
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {tags.map(({ tag, song_count }) => (
              <li
                key={tag}
                className="flex items-center justify-between gap-2 px-3 py-2"
              >
                {editing === tag ? (
                  <form
                    className="flex flex-1 flex-wrap items-center gap-1"
                    onSubmit={(e) => {
                      e.preventDefault();
                      rename(tag);
                    }}
                  >
                    <Input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      maxLength={MAX_TAG_LENGTH}
                      className="h-8 min-w-0 flex-1"
                      autoFocus
                      aria-label={t("newName")}
                      aria-invalid={Boolean(visibleIssue)}
                      aria-describedby={
                        visibleIssue ? "manage-tags-rename-issue" : undefined
                      }
                    />
                    <Button
                      type="submit"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      disabled={isPending || Boolean(draftIssue)}
                      aria-label={t("save")}
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => setEditing(null)}
                      disabled={isPending}
                      aria-label={t("cancel")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    {/* Why the check is greyed out: a red border alone
                        left people guessing what was wrong. */}
                    {visibleIssue && (
                      <p
                        id="manage-tags-rename-issue"
                        className="text-destructive w-full text-xs"
                      >
                        {tTags(`issues.${visibleIssue}`, {
                          max: MAX_TAG_LENGTH,
                        })}
                      </p>
                    )}
                  </form>
                ) : confirmDelete === tag ? (
                  <div className="flex flex-1 items-center justify-between gap-2 text-sm">
                    <span>
                      {t("confirmDelete", { tag, count: song_count })}
                    </span>
                    <span className="flex gap-1">
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={isPending}
                        onClick={() => remove(tag)}
                      >
                        {t("remove")}
                      </Button>
                      {/* Focus lands here: the trash button that opened
                          this row is gone, and a stray Enter should keep
                          the tag, not delete it. */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirmDelete(null)}
                        disabled={isPending}
                        autoFocus
                      >
                        {t("cancel")}
                      </Button>
                    </span>
                  </div>
                ) : (
                  <>
                    <span className="flex min-w-0 items-center gap-2">
                      <TagChip tag={tag} />
                      <span className="text-muted-foreground text-xs">
                        {t("songs", { count: song_count })}
                      </span>
                    </span>
                    <span className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditing(tag);
                          setDraft(tag);
                          setConfirmDelete(null);
                        }}
                        aria-label={t("rename", { tag })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive h-8 w-8"
                        onClick={() => {
                          setConfirmDelete(tag);
                          setEditing(null);
                        }}
                        aria-label={t("removeTag", { tag })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
