"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Setlist } from "@/types/api";
import { createSetlist, updateSetlist } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { toastActionError } from "@/lib/action-toast";
import { LinksEditor } from "@/components/content/links-editor";
import {
  draftsToLinks,
  newLinkDraft,
  type LinkDraft,
  type LinkDraftIssue,
} from "@/lib/content-links";

interface SetlistDialogProps {
  setlist?: Setlist | null;
  isOpen: boolean;
  onClose: () => void;
  bandId?: string;
}

/**
 * Creates or edits a setlist: title, description and reference links.
 * The band repertoire keeps its (translated) name: only its description
 * and links can change.
 */
export function SetlistDialog(props: SetlistDialogProps) {
  return (
    <Dialog
      open={props.isOpen}
      onOpenChange={(open) => !open && props.onClose()}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        {props.isOpen && (
          <SetlistForm key={props.setlist?.id ?? "new"} {...props} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SetlistForm({ setlist, onClose, bandId }: SetlistDialogProps) {
  const t = useTranslations("setlists.dialog");
  const tRepertoire = useTranslations("setlists.repertoire");
  const tCommon = useTranslations("common");

  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(setlist?.title ?? "");
  const [description, setDescription] = useState(setlist?.description ?? "");
  const [links, setLinks] = useState<LinkDraft[]>(() =>
    (setlist?.links ?? []).map((link) => newLinkDraft(link)),
  );
  const [linkIssues, setLinkIssues] = useState<Record<string, LinkDraftIssue>>(
    {},
  );
  const isEditing = !!setlist;
  const isRepertoire = !!setlist?.is_repertoire;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const checked = draftsToLinks(links);
    if (!checked.ok) {
      setLinkIssues(checked.issues);
      toast.error(t("linksInvalid"));
      return;
    }

    startTransition(async () => {
      const result = isEditing
        ? await updateSetlist(
            setlist.id,
            {
              ...(isRepertoire ? {} : { title }),
              description,
              links: checked.links,
            },
            setlist.band_id ?? bandId,
          )
        : await createSetlist({
            title,
            description,
            band_id: bandId,
            links: checked.links,
          });

      if (result.success) {
        toast.success(isEditing ? t("updated") : t("created"));
        onClose();
      } else {
        toastActionError(result, result.error || t("saveFailed"));
      }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{isEditing ? t("editTitle") : t("addTitle")}</DialogTitle>
        <DialogDescription>
          {isRepertoire ? tRepertoire("editHint") : t("description")}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="setlist-title">{t("titleLabel")}</Label>
          {isRepertoire ? (
            <Input
              id="setlist-title"
              value={tRepertoire("name")}
              readOnly
              disabled
            />
          ) : (
            <Input
              id="setlist-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={isPending}
              maxLength={255}
              placeholder={t("titlePlaceholder")}
            />
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="setlist-description">{t("descriptionLabel")}</Label>
          <Input
            id="setlist-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isPending}
            maxLength={2000}
            placeholder={t("descriptionPlaceholder")}
          />
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm leading-none font-medium">
            {t("linksLabel")}
          </legend>
          <LinksEditor
            idPrefix="setlist-links"
            value={links}
            onChange={(next) => {
              setLinks(next);
              setLinkIssues({});
            }}
            issues={linkIssues}
            disabled={isPending}
          />
        </fieldset>
      </div>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isPending}
        >
          {tCommon("cancel")}
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          )}
          {tCommon("save")}
        </Button>
      </DialogFooter>
    </form>
  );
}
