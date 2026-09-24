"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { LoadErrorNotice } from "@/components/load-error-notice";
import { UpgradeHint } from "@/components/content/upgrade-hint";
import { EmptyState } from "@/components/ui/empty-state";
import {
  QuotaChip,
  QuotaLimitNotice,
  quotaState,
  quotaUsageOf,
} from "@/components/quota-usage-list";
import { useOfflineDisabled } from "@/components/offline-disabled";
import type { QuotaReport } from "@/types/api";
import { useMounted } from "@/hooks/use-mounted";
import { groupTours, localToday, type TourPhase } from "@/lib/tours";
import type { Tour } from "@/types/content";
import { TourCard } from "./tour-card";
import { TourDialog } from "./tour-dialog";

const PHASES: TourPhase[] = ["current", "upcoming", "past"];

interface ToursViewProps {
  tours: Tour[];
  bands: Array<{ id: string; name: string }>;
  creatableBands: Array<{ id: string; name: string }>;
  canCreate: boolean;
  loadError: boolean;
  /** `GET /users/me/quotas`, for the usage chip next to "New tour". */
  quotas?: QuotaReport | null;
}

/** Every tour the person can see, grouped into current, upcoming and past. */
export function ToursView({
  tours,
  bands,
  creatableBands,
  canCreate,
  loadError,
  quotas = null,
}: ToursViewProps) {
  const t = useTranslations("tours");
  const offlineDisabled = useOfflineDisabled();
  const quota = quotaUsageOf(quotas, "tours");
  const quotaFull = quotaState(quota).full;
  const createDisabled = !canCreate || quotaFull || offlineDisabled.disabled;
  const mounted = useMounted();
  const [filter, setFilter] = useState("all");
  const [isCreating, setIsCreating] = useState(false);

  // "Today" is the viewer's calendar day: known only in the browser.
  const today = mounted ? localToday() : "";
  const visible = tours.filter((tour) =>
    filter === "all"
      ? true
      : filter === "personal"
        ? !tour.band_id
        : tour.band_id === filter,
  );
  const groups = groupTours(visible, today || "0000-00-00");

  return (
    <div className="w-full space-y-6 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            {canCreate && <QuotaChip usage={quota} resource="tours" />}
            <Button
              onClick={() => setIsCreating(true)}
              title={offlineDisabled.title}
              disabled={createDisabled}
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              {t("newTour")}
            </Button>
          </div>
          {!canCreate ? (
            <UpgradeHint message={t("locked")} />
          ) : (
            <QuotaLimitNotice usage={quota} resource="tours" />
          )}
        </div>
      </div>

      {bands.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="tour-filter">{t("filterLabel")}</Label>
          <NativeSelect
            id="tour-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            wrapperClassName="w-64 max-w-full"
          >
            <option value="all">{t("filterAll")}</option>
            <option value="personal">{t("filterPersonal")}</option>
            {bands.map((band) => (
              <option key={band.id} value={band.id}>
                {band.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      )}

      {loadError && tours.length === 0 ? (
        <LoadErrorNotice />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Route}
          title={t("emptyTitle")}
          description={t("emptyHint")}
          className="bg-card rounded-xl border border-dashed"
          actions={
            canCreate ? (
              <Button
                onClick={() => setIsCreating(true)}
                title={offlineDisabled.title}
                disabled={createDisabled}
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden />
                {t("newTour")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        mounted &&
        PHASES.map((phase) =>
          groups[phase].length === 0 ? null : (
            <section
              key={phase}
              aria-labelledby={`tours-${phase}`}
              className="space-y-3"
            >
              <h2
                id={`tours-${phase}`}
                className="text-muted-foreground text-xs font-semibold tracking-wider uppercase"
              >
                {t(`groups.${phase}`)} ({groups[phase].length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {groups[phase].map((tour) => (
                  <TourCard key={tour.id} tour={tour} today={today} />
                ))}
              </div>
            </section>
          ),
        )
      )}

      <TourDialog
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        bands={creatableBands}
      />
    </div>
  );
}
