"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { useAppRouter } from "@/hooks/use-app-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/lib/toast";
import { toastActionError } from "@/lib/action-toast";
import type { Tour } from "@/types/content";
import { createTour, updateTour } from "../actions";

interface TourDialogProps {
  tour?: Tour | null;
  isOpen: boolean;
  onClose: () => void;
  /** Bands the person can create tours for. */
  bands?: Array<{ id: string; name: string }>;
  /** Locks the scope (created from a band page). */
  fixedBandId?: string;
  /** Open the new tour after creating it. */
  openAfterCreate?: boolean;
}

/** Creates or edits a tour: name, dates, description and (on create) the band. */
export function TourDialog(props: TourDialogProps) {
  return (
    <Dialog
      open={props.isOpen}
      onOpenChange={(open) => !open && props.onClose()}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {props.isOpen && <TourForm {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function TourForm({
  tour,
  onClose,
  bands = [],
  fixedBandId,
  openAfterCreate = true,
}: TourDialogProps) {
  const t = useTranslations("tours.dialog");
  const tCommon = useTranslations("common");
  const router = useAppRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(tour?.name ?? "");
  const [description, setDescription] = useState(tour?.description ?? "");
  const [start, setStart] = useState(tour?.start_date ?? "");
  const [end, setEnd] = useState(tour?.end_date ?? "");
  const [bandId, setBandId] = useState(fixedBandId ?? "");
  const isEditing = !!tour;
  const datesInvalid = !!start && !!end && end < start;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (datesInvalid) {
      toast.error(t("datesInvalid"));
      return;
    }
    startTransition(async () => {
      const result = isEditing
        ? await updateTour(tour.id, {
            name,
            description,
            start_date: start,
            end_date: end,
          })
        : await createTour({
            name,
            description,
            start_date: start,
            end_date: end,
            band_id: bandId || null,
          });
      if (!result.success) {
        toastActionError(result, result.error || t("saveFailed"));
        return;
      }
      toast.success(isEditing ? t("updated") : t("created"));
      onClose();
      if (!isEditing && openAfterCreate && result.data?.id) {
        router.push(`/dashboard/tours/${result.data.id}`);
      }
    });
  };

  return (
    <form onSubmit={submit}>
      <DialogHeader>
        <DialogTitle>{isEditing ? t("editTitle") : t("addTitle")}</DialogTitle>
        <DialogDescription>{t("description")}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="tour-name">{t("nameLabel")} *</Label>
          <Input
            id="tour-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            required
            disabled={isPending}
            placeholder={t("namePlaceholder")}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tour-start">{t("startLabel")} *</Label>
            <Input
              id="tour-start"
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              required
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tour-end">{t("endLabel")} *</Label>
            <Input
              id="tour-end"
              type="date"
              value={end}
              min={start || undefined}
              onChange={(e) => setEnd(e.target.value)}
              required
              disabled={isPending}
              aria-invalid={datesInvalid}
              aria-describedby={datesInvalid ? "tour-dates-error" : undefined}
            />
          </div>
          {datesInvalid && (
            <p
              id="tour-dates-error"
              className="text-destructive col-span-2 text-xs"
            >
              {t("datesInvalid")}
            </p>
          )}
        </div>
        {!isEditing && !fixedBandId && bands.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="tour-band">{t("bandLabel")}</Label>
            <NativeSelect
              id="tour-band"
              value={bandId}
              onChange={(e) => setBandId(e.target.value)}
              disabled={isPending}
            >
              <option value="">{t("personalOption")}</option>
              {bands.map((band) => (
                <option key={band.id} value={band.id}>
                  {band.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="tour-description">{t("descriptionLabel")}</Label>
          <Textarea
            id="tour-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            rows={3}
            disabled={isPending}
            placeholder={t("descriptionPlaceholder")}
          />
        </div>
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
