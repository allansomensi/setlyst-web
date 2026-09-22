"use client";

import { useState, useTransition } from "react";
import { Gig, GigStatus, Setlist } from "@/types/api";
import { createGig, updateGig } from "../actions";
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
import { toast } from "sonner";
import { toastActionError } from "@/lib/action-toast";

export interface BandOption {
  id: string;
  name: string;
  setlists: Setlist[];
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
}

const inputClass =
  "border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50";

/** Converts an ISO-ish API timestamp into the value a
 * `datetime-local` input expects ("YYYY-MM-DDTHH:MM"). */
function toDatetimeLocalValue(value?: string | null): string {
  if (!value) return "";
  return value.slice(0, 16);
}

export function GigDialog({
  gig,
  isOpen,
  onClose,
  personalSetlists,
  bands,
  fixedBandId,
}: GigDialogProps) {
  const t = useTranslations("gigs.dialog");
  const tCommon = useTranslations("common");

  const [isPending, startTransition] = useTransition();
  const isEditing = !!gig;

  const initialScope = fixedBandId ?? gig?.band_id ?? "";
  const [scope, setScope] = useState(initialScope);

  const setlistOptions =
    scope === ""
      ? personalSetlists
      : (bands.find((b) => b.id === scope)?.setlists ?? []);

  const handleAction = (formData: FormData) => {
    const bandId = fixedBandId ?? (formData.get("band_id") as string) ?? "";
    const setlistId = (formData.get("setlist_id") as string) || undefined;
    const status = (formData.get("status") as GigStatus) || undefined;

    const data = {
      venue: formData.get("venue") as string,
      location: (formData.get("location") as string) || undefined,
      scheduled_at: formData.get("scheduled_at") as string,
      band_id: bandId || undefined,
      setlist_id: setlistId,
      status,
      notes: formData.get("notes") as string,
    };

    startTransition(async () => {
      const result = isEditing
        ? await updateGig(
            gig.id,
            {
              venue: data.venue,
              location: data.location,
              scheduled_at: data.scheduled_at,
              setlist_id: setlistId,
              status,
              notes: data.notes,
            },
            gig.band_id ?? undefined,
          )
        : await createGig(data);

      if (result.success) {
        toast.success(isEditing ? t("updated") : t("created"));
        onClose();
      } else {
        toastActionError(result, result.error || t("saveFailed"));
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form action={handleAction} key={gig?.id || "new"}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? t("editTitle") : t("addTitle")}
            </DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="venue">{t("venueLabel")} *</Label>
              <Input
                id="venue"
                name="venue"
                defaultValue={gig?.venue}
                required
                disabled={isPending}
                maxLength={255}
                placeholder={t("venuePlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">{t("locationLabel")}</Label>
              <Input
                id="location"
                name="location"
                defaultValue={gig?.location ?? ""}
                disabled={isPending}
                maxLength={500}
                placeholder={t("locationPlaceholder")}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="scheduled_at">{t("scheduledAtLabel")} *</Label>
                <Input
                  id="scheduled_at"
                  name="scheduled_at"
                  type="datetime-local"
                  defaultValue={toDatetimeLocalValue(gig?.scheduled_at)}
                  required
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">{t("statusLabel")}</Label>
                <select
                  id="status"
                  name="status"
                  className={inputClass}
                  defaultValue={gig?.status ?? "confirmed"}
                  disabled={isPending}
                >
                  <option value="confirmed">{t("status.confirmed")}</option>
                  <option value="cancelled">{t("status.cancelled")}</option>
                  <option value="completed">{t("status.completed")}</option>
                </select>
              </div>
            </div>

            {!fixedBandId && !isEditing && bands.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="band_id">{t("bandLabel")}</Label>
                <select
                  id="band_id"
                  name="band_id"
                  className={inputClass}
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  disabled={isPending}
                >
                  <option value="">{t("personalOption")}</option>
                  {bands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="setlist_id">{t("setlistLabel")}</Label>
              <select
                id="setlist_id"
                name="setlist_id"
                className={inputClass}
                defaultValue={gig?.setlist_id ?? ""}
                disabled={isPending}
              >
                <option value="">{t("noSetlistOption")}</option>
                {setlistOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t("notesLabel")}</Label>
              <textarea
                id="notes"
                name="notes"
                className={inputClass}
                defaultValue={gig?.notes ?? ""}
                disabled={isPending}
                placeholder={t("notesPlaceholder")}
                rows={3}
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
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{" "}
              {tCommon("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
