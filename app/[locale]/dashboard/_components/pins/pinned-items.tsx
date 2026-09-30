"use client";

import { useId, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  GripVertical,
  Guitar,
  ListMusic,
  Music,
  Pin,
  PinOff,
  Route,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/components/nav-link";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { toastActionError } from "@/lib/action-toast";
import { reorderPins, unpinItem } from "@/lib/actions/pins";
import { cn } from "@/lib/utils";
import { setlistDisplayTitle } from "@/lib/repertoire";
import { MAX_PINS, type PinItemType, type PinnedItem } from "@/types/content";
import { safeCallbackPath } from "@/lib/links";
import { formatWallClock } from "@/lib/dates";

/** A show's subtitle as the API sends it: its wall-clock start. */
const GIG_WHEN = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(:\d{2})?$/;

/**
 * The line under a pin's title. A show's is its date, sent as a bare
 * `2026-10-02 21:30`: written out in the viewer's language instead
 * ("sex., 2 de out., 21:30").
 */
function pinSubtitle(item: PinnedItem, locale: string): string | null {
  if (!item.subtitle) return null;
  const match = item.item_type === "gig" && GIG_WHEN.exec(item.subtitle);
  if (!match) return item.subtitle;
  return (
    formatWallClock(`${match[1]}T${match[2]}:00`, locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }) || item.subtitle
  );
}

const PIN_SECTIONS: Record<PinItemType, string> = {
  setlist: "setlists",
  band: "bands",
  song: "songs",
  tour: "tours",
  gig: "gigs",
};

/**
 * Where a pin leads. `href_hint` comes from the API and is only ever a
 * path of this app; anything else (an absolute URL, `//host`) falls back
 * to the page the pin's type and id name.
 */
function pinHref(item: PinnedItem): string {
  const hint = safeCallbackPath(item.href_hint);
  if (hint && hint.startsWith("/dashboard/")) return hint;
  return `/dashboard/${PIN_SECTIONS[item.item_type]}/${item.item_id}`;
}

const TYPE_ICONS: Record<PinItemType, LucideIcon> = {
  setlist: ListMusic,
  band: Guitar,
  song: Music,
  tour: Route,
  gig: Calendar,
};

const keyOf = (item: PinnedItem) => `${item.item_type}:${item.item_id}`;

/**
 * "Fixados" on the home page: the items the person pinned, in their own
 * order. Drag a card by its handle, or use the arrow buttons (keyboard
 * friendly); every change is saved right away.
 */
export function PinnedItems({ initial }: { initial: PinnedItem[] }) {
  const t = useTranslations("pins");
  const [items, setItems] = useState(initial);
  const [isSaving, startSaving] = useTransition();
  // A stable id, so dnd-kit's accessibility ids match between the server
  // render and hydration (its own counter differs between the two).
  const dndId = useId();

  // A server refresh (pin elsewhere, revalidation) replaces the list.
  const [basedOn, setBasedOn] = useState(initial);
  if (basedOn !== initial) {
    setBasedOn(initial);
    setItems(initial);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const save = (next: PinnedItem[], previous: PinnedItem[]) => {
    setItems(next);
    startSaving(async () => {
      const result = await reorderPins(
        next.map((item) => ({
          item_type: item.item_type,
          item_id: item.item_id,
        })),
      );
      if (!result.success) {
        setItems(previous);
        toastActionError(result, result.error || t("reorderFailed"));
      }
    });
  };

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    save(arrayMove(items, index, target), items);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((item) => keyOf(item) === active.id);
    const to = items.findIndex((item) => keyOf(item) === over.id);
    if (from >= 0 && to >= 0) save(arrayMove(items, from, to), items);
  };

  const unpin = (item: PinnedItem) => {
    const previous = items;
    setItems(items.filter((i) => keyOf(i) !== keyOf(item)));
    startSaving(async () => {
      const result = await unpinItem(item.item_type, item.item_id);
      if (result.success) toast.success(t("unpinned"));
      else {
        setItems(previous);
        toastActionError(result, result.error || t("failed"));
      }
    });
  };

  return (
    <section aria-labelledby="pinned-title" className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2
          id="pinned-title"
          className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase"
        >
          <Pin className="h-3.5 w-3.5" aria-hidden />
          {t("title")}
        </h2>
        {items.length > 0 && (
          <span className="text-muted-foreground text-xs tabular-nums">
            {t("limit", { count: items.length, max: MAX_PINS })}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="bg-card text-muted-foreground flex items-start gap-3 rounded-xl border border-dashed p-4 text-sm">
          <Pin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>{t("empty")}</p>
        </div>
      ) : (
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={items.map(keyOf)}
            strategy={rectSortingStrategy}
          >
            <ol
              className={cn(
                "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3",
                isSaving && "opacity-80",
              )}
            >
              {items.map((item, index) => (
                <PinnedCard
                  key={keyOf(item)}
                  item={item}
                  index={index}
                  total={items.length}
                  onMove={move}
                  onUnpin={unpin}
                  disabled={isSaving}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}

function PinnedCard({
  item,
  index,
  total,
  onMove,
  onUnpin,
  disabled,
}: {
  item: PinnedItem;
  index: number;
  total: number;
  onMove: (index: number, delta: -1 | 1) => void;
  onUnpin: (item: PinnedItem) => void;
  disabled: boolean;
}) {
  const t = useTranslations("pins");
  const tRepertoire = useTranslations("setlists.repertoire");
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: keyOf(item) });
  const locale = useLocale();
  const Icon = TYPE_ICONS[item.item_type];
  const title = setlistDisplayTitle(item, tRepertoire("name"));
  const subtitle = pinSubtitle(item, locale);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "bg-card group relative flex items-center gap-2 rounded-xl border p-2 pr-1 shadow-(--shadow-surface) transition-colors",
        isDragging
          ? "border-primary z-10 shadow-lg"
          : "hover:border-primary/40",
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="text-muted-foreground/60 hover:text-foreground group-hover:text-muted-foreground focus-visible:ring-ring/50 flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded focus-visible:ring-2 focus-visible:outline-none active:cursor-grabbing"
        aria-label={t("dragHandle", { title })}
      >
        <GripVertical className="h-4 w-4" aria-hidden />
      </button>
      <Link
        href={pinHref(item)}
        className="focus-visible:ring-ring/50 flex min-w-0 flex-1 items-center gap-3 rounded-md py-1 focus-visible:ring-2 focus-visible:outline-none"
      >
        <span className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold" title={title}>
            {title}
          </span>
          <span className="text-muted-foreground block truncate text-xs">
            {t(`types.${item.item_type}`)}
            {subtitle ? ` · ${subtitle}` : ""}
          </span>
        </span>
      </Link>
      {/* With a mouse, the controls appear over the card's end on hover
          or focus, so the title gets the whole width the rest of the
          time; on a touch screen (no hover) they stay in the row. */}
      <div className="flex shrink-0 items-center pointer-fine:absolute pointer-fine:inset-y-1 pointer-fine:right-1 pointer-fine:rounded-lg pointer-fine:bg-linear-to-r pointer-fine:from-transparent pointer-fine:via-(--color-card) pointer-fine:via-25% pointer-fine:to-(--color-card) pointer-fine:pl-6 pointer-fine:opacity-0 pointer-fine:transition-opacity pointer-fine:group-focus-within:opacity-100 pointer-fine:group-hover:opacity-100">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onMove(index, -1)}
          disabled={disabled || index === 0}
          aria-label={t("moveUp", { title })}
          title={t("moveUp", { title })}
        >
          <ArrowUp className="h-3.5 w-3.5" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onMove(index, 1)}
          disabled={disabled || index === total - 1}
          aria-label={t("moveDown", { title })}
          title={t("moveDown", { title })}
        >
          <ArrowDown className="h-3.5 w-3.5" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onUnpin(item)}
          disabled={disabled}
          aria-label={t("unpinNamed", { name: title })}
          title={t("unpin")}
        >
          <PinOff className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </div>
    </li>
  );
}
