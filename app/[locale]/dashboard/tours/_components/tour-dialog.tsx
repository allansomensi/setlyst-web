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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/lib/toast";
import { toastActionError } from "@/lib/action-toast";
import { FieldError } from "@/components/ui/field-error";
import { GuardedDialog, useGuardedForm } from "@/components/ui/guarded-dialog";
import { fieldA11y, focusFirstError, type FieldErrors } from "@/lib/forms";
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
    <GuardedDialog
      open={props.isOpen}
      onClose={props.onClose}
      className="max-h-[90dvh] overflow-y-auto sm:max-w-lg"
    >
      <TourForm {...props} />
    </GuardedDialog>
  );
}

type TourField = "name" | "start" | "end";
const FIELD_ORDER = [
  { key: "name", id: "tour-name" },
  { key: "start", id: "tour-start" },
  { key: "end", id: "tour-end" },
] as const satisfies readonly { key: TourField; id: string }[];

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
  const [errors, setErrors] = useState<FieldErrors<TourField>>({});
  const isEditing = !!tour;
  const datesInvalid = !!start && !!end && end < start;

  const isDirty =
    name !== (tour?.name ?? "") ||
    description !== (tour?.description ?? "") ||
    start !== (tour?.start_date ?? "") ||
    end !== (tour?.end_date ?? "") ||
    bandId !== (fixedBandId ?? "");
  const requestClose = useGuardedForm({ isDirty, isPending }, onClose);

  const clearError = (field: TourField) =>
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (isPending) return;

    const nextErrors: FieldErrors<TourField> = {};
    if (!name.trim()) nextErrors.name = t("nameRequired");
    if (!start) nextErrors.start = t("dateRequired");
    if (!end) nextErrors.end = t("dateRequired");
    else if (datesInvalid) nextErrors.end = t("datesInvalid");
    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors);
      focusFirstError(nextErrors, FIELD_ORDER);
      return;
    }
    setErrors({});
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
    <form onSubmit={submit} noValidate>
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
            onChange={(e) => {
              setName(e.target.value);
              clearError("name");
            }}
            maxLength={120}
            required
            aria-required
            disabled={isPending}
            placeholder={t("namePlaceholder")}
            {...fieldA11y("tour-name", errors.name)}
          />
          <FieldError fieldId="tour-name" message={errors.name} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tour-start">{t("startLabel")} *</Label>
            <Input
              id="tour-start"
              type="date"
              value={start}
              onChange={(e) => {
                setStart(e.target.value);
                clearError("start");
              }}
              required
              aria-required
              disabled={isPending}
              {...fieldA11y("tour-start", errors.start)}
            />
            <FieldError fieldId="tour-start" message={errors.start} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tour-end">{t("endLabel")} *</Label>
            <Input
              id="tour-end"
              type="date"
              value={end}
              min={start || undefined}
              onChange={(e) => {
                setEnd(e.target.value);
                clearError("end");
              }}
              required
              aria-required
              disabled={isPending}
              {...fieldA11y(
                "tour-end",
                errors.end ?? (datesInvalid ? t("datesInvalid") : null),
              )}
            />
            <FieldError
              fieldId="tour-end"
              message={errors.end ?? (datesInvalid ? t("datesInvalid") : null)}
            />
          </div>
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
