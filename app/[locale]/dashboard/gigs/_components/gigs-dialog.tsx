"use client";

import { useState, useTransition, type FormEvent } from "react";
import { DiscardChangesDialog } from "@/components/ui/discard-changes-dialog";
import { useDialogCloseGuard } from "@/hooks/use-dialog-close-guard";
import { FieldError } from "@/components/ui/field-error";
import { fieldA11y, focusFirstError, type FieldErrors } from "@/lib/forms";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Gig, GigStatus, Setlist } from "@/types/api";
import { createGig, updateGig } from "../actions";
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
import { isNoChangeError } from "@/lib/api-errors";
import { cn } from "@/lib/utils";

export interface BandOption {
  id: string;
  name: string;
  setlists: Setlist[];
}

/** A tour a gig can belong to (same scope as the gig). */
export interface TourOption {
  id: string;
  name: string;
  band_id: string | null;
}

interface GigDialogProps {
  gig?: Gig | null;
  isOpen: boolean;
  onClose: () => void;
  /** The caller's personal (non-band) setlists, offered when no band is picked. */
  personalSetlists: Setlist[];
  /** Bands the caller may create/manage gigs for, each with its own setlists. */
  bands: BandOption[];
  /** Locks the band scope (e.g. when opened from a band's own gigs page). */
  fixedBandId?: string;
  /** Tours offered in the tour select (filtered by the gig's scope). */
  tours?: TourOption[];
  /** Pre-selects a tour for a new gig ("Adicionar show" on a tour). */
  initialTourId?: string;
}

const STATUSES: GigStatus[] = ["confirmed", "cancelled", "completed"];

/** The status picker's dot and checked tint: the same colours as the
 * GigStatusBadge the show will wear on every list. */
const STATUS_DOT: Record<GigStatus, string> = {
  confirmed: "bg-primary",
  completed: "bg-emerald-500",
  cancelled: "bg-destructive",
};
const STATUS_CHECKED: Record<GigStatus, string> = {
  confirmed:
    "has-checked:border-primary/40 has-checked:bg-primary/10 has-checked:text-primary",
  completed:
    "has-checked:border-emerald-500/40 has-checked:bg-emerald-500/10 has-checked:text-emerald-700 dark:has-checked:text-emerald-300",
  cancelled:
    "has-checked:border-destructive/40 has-checked:bg-destructive/10 has-checked:text-destructive",
};

interface GigFormState {
  venue: string;
  location: string;
  /**
   * The venue's wall-clock date ("YYYY-MM-DD") and time ("HH:MM"), as two
   * fields: one `datetime-local` input showed "mm/dd/yyyy, --:--" squeezed
   * into half a row, and on a phone opened a single picker for both where
   * most people only wanted to change one.
   */
  date: string;
  time: string;
  status: GigStatus;
  /** "" = personal. */
  scope: string;
  /** "" = no setlist. */
  setlistId: string;
  /** "" = no tour. */
  tourId: string;
  notes: string;
}

function initialState(
  gig: Gig | null | undefined,
  fixedBandId?: string,
  initialTourId?: string,
) {
  return {
    venue: gig?.venue ?? "",
    location: gig?.location ?? "",
    date: gig?.scheduled_at?.slice(0, 10) ?? "",
    time: gig?.scheduled_at?.slice(11, 16) ?? "",
    status: gig?.status ?? "confirmed",
    scope: fixedBandId ?? gig?.band_id ?? "",
    setlistId: gig?.setlist_id ?? "",
    tourId: gig?.tour_id ?? initialTourId ?? "",
    notes: gig?.notes ?? "",
  } satisfies GigFormState;
}

type GigField = "venue" | "date" | "time";
const FIELD_ORDER = [
  { key: "venue", id: "gig-venue" },
  { key: "date", id: "gig-date" },
  { key: "time", id: "gig-time" },
] as const satisfies readonly { key: GigField; id: string }[];

/**
 * Creates or edits a gig.
 *
 * Controlled, and remounted per gig by its callers (`key={gig?.id ??
 * "new"}`), so switching between gigs never shows the previous one's
 * setlist options. Clearing the location, notes or setlist really clears
 * them (sent as `null`).
 */
export function GigDialog({
  gig,
  isOpen,
  onClose,
  personalSetlists,
  bands,
  fixedBandId,
  tours = [],
  initialTourId,
}: GigDialogProps) {
  const t = useTranslations("gigs.dialog");
  const tCommon = useTranslations("common");
  const tRepertoire = useTranslations("setlists.repertoire");

  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<GigFormState>(() =>
    initialState(gig, fixedBandId, initialTourId),
  );
  const [initialForm] = useState<GigFormState>(() =>
    initialState(gig, fixedBandId, initialTourId),
  );
  const isEditing = !!gig;
  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm);
  const closeGuard = useDialogCloseGuard({ isDirty, isPending, onClose });
  const [errors, setErrors] = useState<FieldErrors<GigField>>({});

  const set = <K extends keyof GigFormState>(
    key: K,
    value: GigFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key in errors) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const setlistOptions =
    form.scope === ""
      ? personalSetlists
      : (bands.find((b) => b.id === form.scope)?.setlists ?? []);
  const tourOptions = tours.filter(
    (tour) => (tour.band_id ?? "") === form.scope,
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) return;

    const nextErrors: FieldErrors<GigField> = {};
    if (!form.venue.trim()) nextErrors.venue = t("venueRequired");
    if (!form.date) nextErrors.date = t("dateRequired");
    if (!form.time) nextErrors.time = t("timeRequired");
    if (nextErrors.venue || nextErrors.date || nextErrors.time) {
      setErrors(nextErrors);
      focusFirstError(nextErrors, FIELD_ORDER);
      return;
    }
    setErrors({});
    const scheduledAt = `${form.date}T${form.time}`;

    startTransition(async () => {
      const result = isEditing
        ? await updateGig(
            gig.id,
            {
              venue: form.venue,
              location: form.location,
              scheduled_at: scheduledAt,
              setlist_id: form.setlistId || null,
              tour_id: form.tourId || null,
              status: form.status,
              notes: form.notes,
            },
            gig.band_id ?? undefined,
          )
        : await createGig({
            venue: form.venue,
            location: form.location || undefined,
            scheduled_at: scheduledAt,
            band_id: form.scope || undefined,
            setlist_id: form.setlistId || undefined,
            tour_id: form.tourId || undefined,
            status: form.status,
            notes: form.notes || undefined,
          });

      if (result.success) {
        toast.success(isEditing ? t("updated") : t("created"));
        onClose();
        return;
      }
      toastActionError(result, result.error || t("saveFailed"));
      if (isNoChangeError(result)) onClose();
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={closeGuard.onOpenChange}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <form onSubmit={handleSubmit} noValidate>
            <DialogHeader>
              <DialogTitle>
                {isEditing ? t("editTitle") : t("addTitle")}
              </DialogTitle>
              <DialogDescription>{t("description")}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="gig-venue">{t("venueLabel")} *</Label>
                <Input
                  id="gig-venue"
                  value={form.venue}
                  onChange={(e) => set("venue", e.target.value)}
                  required
                  aria-required
                  disabled={isPending}
                  maxLength={255}
                  placeholder={t("venuePlaceholder")}
                  {...fieldA11y("gig-venue", errors.venue)}
                />
                <FieldError fieldId="gig-venue" message={errors.venue} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gig-location">{t("locationLabel")}</Label>
                <Input
                  id="gig-location"
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                  disabled={isPending}
                  maxLength={500}
                  placeholder={t("locationPlaceholder")}
                />
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,9rem)] gap-3">
                <div className="space-y-2">
                  <Label htmlFor="gig-date">{t("dateLabel")} *</Label>
                  <Input
                    id="gig-date"
                    type="date"
                    value={form.date}
                    onChange={(e) => set("date", e.target.value)}
                    required
                    aria-required
                    disabled={isPending}
                    {...fieldA11y("gig-date", errors.date)}
                  />
                  <FieldError fieldId="gig-date" message={errors.date} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gig-time">{t("timeLabel")} *</Label>
                  <Input
                    id="gig-time"
                    type="time"
                    value={form.time}
                    onChange={(e) => set("time", e.target.value)}
                    required
                    aria-required
                    disabled={isPending}
                    {...fieldA11y("gig-time", errors.time)}
                  />
                  <FieldError fieldId="gig-time" message={errors.time} />
                </div>
              </div>

              {!fixedBandId && !isEditing && bands.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="gig-band">{t("bandLabel")}</Label>
                  <NativeSelect
                    id="gig-band"
                    value={form.scope}
                    onChange={(e) =>
                      // A setlist of the previous scope can't be linked.
                      setForm((prev) => ({
                        ...prev,
                        scope: e.target.value,
                        setlistId: "",
                        tourId: "",
                      }))
                    }
                    disabled={isPending}
                  >
                    <option value="">{t("personalOption")}</option>
                    {bands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="gig-setlist">{t("setlistLabel")}</Label>
                <NativeSelect
                  id="gig-setlist"
                  value={form.setlistId}
                  onChange={(e) => set("setlistId", e.target.value)}
                  disabled={isPending}
                >
                  <option value="">{t("noSetlistOption")}</option>
                  {setlistOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.is_repertoire ? tRepertoire("name") : s.title}
                    </option>
                  ))}
                  {/* Linked to a setlist that isn't among the options (one
                      shared with this account, not owned): without its own
                      option the select read "No setlist" while the form
                      still held the link. Same fallback as the tour. */}
                  {form.setlistId &&
                    !setlistOptions.some((s) => s.id === form.setlistId) && (
                      <option value={form.setlistId}>
                        {t("currentSetlist")}
                      </option>
                    )}
                </NativeSelect>
              </div>

              {(tourOptions.length > 0 || form.tourId) && (
                <div className="space-y-2">
                  <Label htmlFor="gig-tour">{t("tourLabel")}</Label>
                  <NativeSelect
                    id="gig-tour"
                    value={form.tourId}
                    onChange={(e) => set("tourId", e.target.value)}
                    disabled={isPending}
                  >
                    <option value="">{t("noTourOption")}</option>
                    {tourOptions.map((tour) => (
                      <option key={tour.id} value={tour.id}>
                        {tour.name}
                      </option>
                    ))}
                    {form.tourId &&
                      !tourOptions.some((tour) => tour.id === form.tourId) && (
                        <option value={form.tourId}>
                          {gig?.tour_name ?? t("currentTour")}
                        </option>
                      )}
                  </NativeSelect>
                </div>
              )}

              {/* Three options, all visible: one tap instead of opening a
                  select, and each wears the colour it will have on the
                  lists. */}
              <fieldset className="space-y-2">
                <legend className="text-sm leading-none font-medium">
                  {t("statusLabel")}
                </legend>
                <div className="grid grid-cols-3 gap-2">
                  {STATUSES.map((status) => (
                    <label
                      key={status}
                      className={cn(
                        "has-focus-visible:ring-ring/50 text-muted-foreground hover:bg-muted/50 flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-1.5 text-[13px] transition-colors has-checked:font-medium has-focus-visible:ring-3 has-disabled:cursor-not-allowed has-disabled:opacity-60 sm:text-sm pointer-coarse:min-h-11",
                        STATUS_CHECKED[status],
                      )}
                    >
                      <input
                        type="radio"
                        name="gig-status"
                        value={status}
                        checked={form.status === status}
                        onChange={() => set("status", status)}
                        disabled={isPending}
                        className="sr-only"
                      />
                      <span
                        aria-hidden
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          STATUS_DOT[status],
                        )}
                      />
                      <span className="truncate">{t(`status.${status}`)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="space-y-2">
                <Label htmlFor="gig-notes">{t("notesLabel")}</Label>
                <Textarea
                  id="gig-notes"
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  disabled={isPending}
                  placeholder={t("notesPlaceholder")}
                  rows={3}
                  maxLength={2000}
                  className="min-h-20"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeGuard.requestClose}
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
        </DialogContent>
      </Dialog>
      <DiscardChangesDialog {...closeGuard.discard} />
    </>
  );
}
