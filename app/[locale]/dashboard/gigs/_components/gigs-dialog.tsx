"use client";

import { useState, useTransition, type FormEvent } from "react";
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

/** Converts an ISO-ish API timestamp into the value a
 * `datetime-local` input expects ("YYYY-MM-DDTHH:MM"). */
function toDatetimeLocalValue(value?: string | null): string {
  if (!value) return "";
  return value.slice(0, 16);
}

interface GigFormState {
  venue: string;
  location: string;
  scheduledAt: string;
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
    scheduledAt: toDatetimeLocalValue(gig?.scheduled_at),
    status: gig?.status ?? "confirmed",
    scope: fixedBandId ?? gig?.band_id ?? "",
    setlistId: gig?.setlist_id ?? "",
    tourId: gig?.tour_id ?? initialTourId ?? "",
    notes: gig?.notes ?? "",
  } satisfies GigFormState;
}

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
  const isEditing = !!gig;

  const set = <K extends keyof GigFormState>(key: K, value: GigFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setlistOptions =
    form.scope === ""
      ? personalSetlists
      : (bands.find((b) => b.id === form.scope)?.setlists ?? []);
  const tourOptions = tours.filter(
    (tour) => (tour.band_id ?? "") === form.scope,
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const result = isEditing
        ? await updateGig(
            gig.id,
            {
              venue: form.venue,
              location: form.location,
              scheduled_at: form.scheduledAt,
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
            scheduled_at: form.scheduledAt,
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
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
                disabled={isPending}
                maxLength={255}
                placeholder={t("venuePlaceholder")}
              />
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gig-scheduled-at">
                  {t("scheduledAtLabel")} *
                </Label>
                <Input
                  id="gig-scheduled-at"
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => set("scheduledAt", e.target.value)}
                  required
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gig-status">{t("statusLabel")}</Label>
                <NativeSelect
                  id="gig-status"
                  value={form.status}
                  onChange={(e) => set("status", e.target.value as GigStatus)}
                  disabled={isPending}
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {t(`status.${status}`)}
                    </option>
                  ))}
                </NativeSelect>
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
      </DialogContent>
    </Dialog>
  );
}
