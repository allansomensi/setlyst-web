"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Setlist } from "@/types/api";
import { createSetlist, updateSetlist } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { toastActionError } from "@/lib/action-toast";
import { LinksEditor } from "@/components/content/links-editor";
import { FieldError } from "@/components/ui/field-error";
import { GuardedDialog, useGuardedForm } from "@/components/ui/guarded-dialog";
import { fieldA11y, focusFirstError, type FieldErrors } from "@/lib/forms";
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
    <GuardedDialog
      open={props.isOpen}
      onClose={props.onClose}
      className="max-h-[90dvh] overflow-y-auto sm:max-w-xl"
    >
      <SetlistForm key={props.setlist?.id ?? "new"} {...props} />
    </GuardedDialog>
  );
}

/** What a list of link rows says, ignoring their React keys. */
function linksSignature(links: LinkDraft[]): string {
  return JSON.stringify(links.map(({ url, label }) => [url, label]));
}

type SetlistField = "title" | "links";
const FIELD_ORDER = [
  { key: "title", id: "setlist-title" },
  { key: "links", id: "setlist-links-error-anchor" },
] as const satisfies readonly { key: SetlistField; id: string }[];

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
  const [errors, setErrors] = useState<FieldErrors<SetlistField>>({});
  const [initialLinks] = useState(() => linksSignature(links));
  const isEditing = !!setlist;
  const isRepertoire = !!setlist?.is_repertoire;

  const isDirty =
    title !== (setlist?.title ?? "") ||
    description !== (setlist?.description ?? "") ||
    linksSignature(links) !== initialLinks;
  const requestClose = useGuardedForm({ isDirty, isPending }, onClose);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (isPending) return;

    const nextErrors: FieldErrors<SetlistField> = {};
    if (!isRepertoire && !title.trim()) {
      nextErrors.title = t("titleRequired");
    }
    const checked = draftsToLinks(links);
    if (!checked.ok) {
      setLinkIssues(checked.issues);
      nextErrors.links = t("linksInvalid");
    }
    if (!checked.ok || nextErrors.title) {
      setErrors(nextErrors);
      focusFirstError(nextErrors, FIELD_ORDER);
      return;
    }
    setErrors({});

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
    <form onSubmit={handleSubmit} noValidate>
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
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title)
                  setErrors((prev) => ({ ...prev, title: undefined }));
              }}
              required
              aria-required
              disabled={isPending}
              maxLength={255}
              placeholder={t("titlePlaceholder")}
              {...fieldA11y("setlist-title", errors.title)}
            />
          )}
          <FieldError fieldId="setlist-title" message={errors.title} />
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
          <div
            id="setlist-links-error-anchor"
            tabIndex={-1}
            className="outline-none"
          >
            <FieldError fieldId="setlist-links" message={errors.links} />
          </div>
          <LinksEditor
            idPrefix="setlist-links"
            value={links}
            onChange={(next) => {
              setLinks(next);
              setLinkIssues({});
              if (errors.links)
                setErrors((prev) => ({ ...prev, links: undefined }));
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
          onClick={requestClose}
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
