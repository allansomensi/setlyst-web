"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
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
  // The order last saved (row ids), kept until the page data catches up.
  const [savedOrder, setSavedOrder] = useState<string[] | null>(null);
  const [isSaving, startSaving] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Compared by content rather than by the identity of `baseRows`: any
  // refresh landing between the save and the reorder's own (a debounced
  // key change, a bandmate's edit) brings the *old* order in a new array,
  // which used to snap the table back for a moment. As long as the page
  // still lists the same rows, they're shown in the saved order; a
  // different set of rows is newer than the save and wins.
  const rows = useMemo(() => {
    if (isReordering) return draft;
    if (!savedOrder) return baseRows;
    const position = new Map(savedOrder.map((id, index) => [id, index]));
    if (
      baseRows.length !== position.size ||
      !baseRows.every((row) => position.has(row.id))
    ) {
      return baseRows;
    }
    const alreadyInOrder = baseRows.every(
      (row, index) => position.get(row.id) === index,
    );
    return alreadyInOrder
      ? baseRows
      : [...baseRows].sort(
          (a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0),
        );
  }, [isReordering, draft, savedOrder, baseRows]);

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

  /**
   * Moves a row one step up or down (the "Move up/down" buttons, the
   * alternative to dragging). A no-op at that end of the list. Stable:
   * the rows keep their memoized render across moves.
   */
  const move = useCallback((id: string, delta: -1 | 1) => {
    setDraft((prev) => {
      const from = prev.findIndex((row) => row.id === id);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= prev.length) return prev;
      return arrayMove(prev, from, to);
    });
  }, []);

  const save = () => {
    const order = draft;
    startSaving(async () => {
      const result = await reorderSetlistItems(
        setlistId,
        order.map((row) => ({ item_type: row.kind, id: row.id })),
      );
      if (result.success) {
        setSavedOrder(order.map((row) => row.id));
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
    move,
    onDragEnd,
  };
}
