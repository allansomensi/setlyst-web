"use client";

import { useState, useTransition } from "react";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
import { toastActionError } from "@/lib/action-toast";
import { reorderSetlistItems } from "../../actions";
import type { Row } from "./rows/types";

/**
 * Reorder mode of the running order: a local copy of the rows the person
 * drags around, saved in one request.
 *
 * After saving, the saved order stays on screen until the refreshed page
 * data arrives (`baseRows` changes), instead of flashing back to the old
 * order for a moment.
 */
export function useSetlistReorder(setlistId: string, baseRows: Row[]) {
  const t = useTranslations("setlists.songs");
  const [isReordering, setIsReordering] = useState(false);
  const [draft, setDraft] = useState<Row[]>([]);
  const [saved, setSaved] = useState<{ rows: Row[]; basedOn: Row[] } | null>(
    null,
  );
  const [isSaving, startSaving] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const rows = isReordering
    ? draft
    : saved && saved.basedOn === baseRows
      ? saved.rows
      : baseRows;

  const start = () => {
    setDraft(rows);
    setIsReordering(true);
  };

  const cancel = () => {
    setIsReordering(false);
    setDraft([]);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setDraft((prev) => {
      const from = prev.findIndex((row) => row.id === active.id);
      const to = prev.findIndex((row) => row.id === over.id);
      return arrayMove(prev, from, to);
    });
  };

  const save = () => {
    const order = draft;
    startSaving(async () => {
      const result = await reorderSetlistItems(
        setlistId,
        order.map((row) => ({ item_type: row.kind, id: row.id })),
      );
      if (result.success) {
        setSaved({ rows: order, basedOn: baseRows });
        setIsReordering(false);
        toast.success(t("orderSaved"));
      } else {
        toastActionError(result, result.error);
      }
    });
  };

  return {
    rows,
    isReordering,
    isSaving,
    sensors,
    start,
    cancel,
    save,
    onDragEnd,
  };
}
