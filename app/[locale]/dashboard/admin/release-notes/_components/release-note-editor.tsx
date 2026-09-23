"use client";

import { useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  EyeOff,
  Info,
  Loader2,
  Plus,
  Save,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ClientDate } from "@/components/client-date";
import { Link } from "@/components/nav-link";
import { ReleaseNotesList } from "@/components/release-notes/release-notes-list";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { useRouter } from "@/i18n/routing";
import { LOCALE_NAMES } from "@/i18n/locales";
import { toastActionError } from "@/lib/action-toast";
import {
  RELEASE_ITEM_KINDS,
  RELEASE_ITEM_MAX,
  RELEASE_LOCALES,
  RELEASE_MAX_ITEMS,
  RELEASE_TITLE_MAX,
  REQUIRED_RELEASE_LOCALES,
  emptyReleaseItem,
  emptyReleaseNoteForm,
  formToReleasePayload,
  localesWithIssues,
  moveItem,
  releaseNoteToForm,
  validateReleaseNoteForm,
  type ReleaseIssue,
  type ReleaseLocale,
  type ReleaseNoteForm,
} from "@/lib/release-note-editor";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { ReleaseItemKind, ReleaseNote } from "@/types/public";
import {
  createReleaseNote,
  deleteReleaseNote,
  publishReleaseNote,
  unpublishReleaseNote,
  updateReleaseNote,
} from "../actions";

function Counter({ value, max }: { value: string; max: number }) {
  const length = Array.from(value.trim()).length;
  return (
    <span
      className={cn(
        "text-xs tabular-nums",
        length > max ? "text-destructive font-medium" : "text-muted-foreground",
      )}
    >
      {length}/{max}
    </span>
  );
}

type Dialog = "publish" | "unpublish" | "delete" | null;

export function ReleaseNoteEditor({
  note,
  canWrite,
  today,
}: {
  note: ReleaseNote | null;
  canWrite: boolean;
  /** `YYYY-MM-DD`, for a new note's default date. */
  today: string;
}) {
  const t = useTranslations("releaseNotesAdmin");
  const tKinds = useTranslations("releaseNotes.kinds");
  const router = useRouter();
  const [saved, setSaved] = useState(note);
  const [form, setForm] = useState<ReleaseNoteForm>(() =>
    note ? releaseNoteToForm(note) : emptyReleaseNoteForm(today),
  );
  const [baseline, setBaseline] = useState(() =>
    JSON.stringify(formToReleasePayload(form)),
  );
  const [locale, setLocale] = useState<ReleaseLocale>("pt-BR");
  const [showErrors, setShowErrors] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notify, setNotify] = useState(true);
  const [pending, startTransition] = useTransition();

  const payload = formToReleasePayload(form);
  const isDirty = JSON.stringify(payload) !== baseline;
  const issues = validateReleaseNoteForm(form);
  const visibleIssues = showErrors ? issues : [];
  const badLocales = localesWithIssues(visibleIssues);
  const guard = useUnsavedChangesGuard(canWrite && isDirty && !pending);
  const readOnly = !canWrite;
  const isPublished = Boolean(saved?.published_at);

  const issueFor = (
    field: string,
    loc?: ReleaseLocale,
  ): ReleaseIssue | undefined =>
    visibleIssues.find(
      (i) => i.field === field && (loc === undefined || i.locale === loc),
    );

  const issueText = (issue: ReleaseIssue | undefined, max?: number) =>
    issue ? (
      <p className="text-destructive text-xs" role="alert">
        {t(`issues.${issue.code}`, { max: max ?? 0 })}
      </p>
    ) : null;

  const setTitle = (value: string) =>
    setForm((prev) => ({ ...prev, title: { ...prev.title, [locale]: value } }));

  const setItem = (
    index: number,
    change: Partial<{ kind: ReleaseItemKind; text: string }>,
  ) =>
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index
          ? {
              ...item,
              kind: change.kind ?? item.kind,
              text:
                change.text !== undefined
                  ? { ...item.text, [locale]: change.text }
                  : item.text,
            }
          : item,
      ),
    }));

  const move = (from: number, to: number) => {
    setForm((prev) => ({ ...prev, items: moveItem(prev.items, from, to) }));
    // Keep keyboard focus on the moved item's button.
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLButtonElement>(
          `[data-move="${to}-${to < from ? "up" : "down"}"]`,
        )
        ?.focus();
    });
  };

  const save = async (): Promise<ReleaseNote | null> => {
    setShowErrors(true);
    if (issues.length > 0) {
      toast.error(t("fixErrors"));
      const firstLocale = issues.find((i) => i.locale)?.locale;
      if (firstLocale) setLocale(firstLocale);
      return null;
    }
    if (saved && !isDirty) return saved;
    const result = saved
      ? await updateReleaseNote(saved.id, payload)
      : await createReleaseNote(payload);
    if (!result.success || !result.data) {
      toastActionError(result, result.success ? t("saveFailed") : result.error);
      return null;
    }
    return result.data;
  };

  const applySaved = (next: ReleaseNote, message: string) => {
    const nextForm = releaseNoteToForm(next);
    setSaved(next);
    setForm(nextForm);
    setBaseline(JSON.stringify(formToReleasePayload(nextForm)));
    setShowErrors(false);
    toast.success(message);
    if (!saved) {
      guard.release();
      router.replace(`/dashboard/admin/release-notes/${next.id}`);
    } else {
      router.refresh();
    }
  };

  const onSave = () =>
    startTransition(async () => {
      const next = await save();
      if (next) applySaved(next, t("saved"));
    });

  const onPublish = () =>
    startTransition(async () => {
      const current = await save();
      if (!current) {
        setDialog(null);
        return;
      }
      const result = await publishReleaseNote(current.id, notify);
      setDialog(null);
      if (!result.success || !result.data) {
        toastActionError(
          result,
          result.success ? t("saveFailed") : result.error,
        );
        return;
      }
      applySaved(result.data, notify ? t("publishedNotified") : t("published"));
    });

  const onUnpublish = () =>
    startTransition(async () => {
      if (!saved) return;
      const result = await unpublishReleaseNote(saved.id);
      setDialog(null);
      if (!result.success || !result.data) {
        toastActionError(
          result,
          result.success ? t("saveFailed") : result.error,
        );
        return;
      }
      applySaved(result.data, t("unpublished"));
    });

  const onDelete = () =>
    startTransition(async () => {
      if (!saved) return;
      const result = await deleteReleaseNote(saved.id);
      if (!result.success) {
        setDialog(null);
        toastActionError(result, result.error);
        return;
      }
      guard.release();
      toast.success(t("deleted"));
      router.replace("/dashboard/admin/release-notes");
    });

  const now = new Date().toISOString().replace("Z", "");
  const previewNote: ReleaseNote = {
    id: saved?.id ?? "preview",
    version: payload.version || "0.0.0",
    title: payload.title,
    items: payload.items,
    released_on: /^\d{4}-\d{2}-\d{2}$/.test(payload.released_on)
      ? payload.released_on
      : today,
    published_at: saved?.published_at ?? null,
    created_at: saved?.created_at ?? now,
    updated_at: saved?.updated_at ?? now,
    updated_by_username: saved?.updated_by_username ?? null,
    is_edited: saved?.is_edited ?? false,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/dashboard/admin/release-notes">
              <ArrowLeft aria-hidden />
              {t("back")}
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {saved
                ? t("editTitle", { version: saved.version })
                : t("newTitle")}
            </h1>
            {saved && (
              <Badge
                variant="outline"
                className={cn(
                  isPublished
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "text-muted-foreground",
                )}
              >
                {isPublished ? t("statusPublished") : t("statusDraft")}
              </Badge>
            )}
            {isDirty && canWrite && (
              <Badge variant="secondary">{t("unsaved")}</Badge>
            )}
          </div>
          {saved && (
            <p className="text-muted-foreground text-sm">
              {saved.is_edited ? t("editedInfo") : t("lastSaved")}{" "}
              <ClientDate
                value={saved.updated_at}
                options={{ dateStyle: "medium", timeStyle: "short" }}
              />
              {saved.updated_by_username &&
                ` · ${t("byUser", { username: saved.updated_by_username })}`}
            </p>
          )}
        </div>
        {canWrite && (
          <div className="flex flex-wrap gap-2">
            {saved && (
              <Button
                variant="ghost"
                onClick={() => setDialog("delete")}
                disabled={pending}
              >
                <Trash2 aria-hidden />
                {t("delete")}
              </Button>
            )}
            {saved && isPublished && (
              <Button
                variant="outline"
                onClick={() => setDialog("unpublish")}
                disabled={pending}
              >
                <EyeOff aria-hidden />
                {t("unpublish")}
              </Button>
            )}
            <Button
              variant={isPublished ? "default" : "outline"}
              onClick={onSave}
              disabled={pending || (!!saved && !isDirty)}
            >
              {pending && dialog === null ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <Save aria-hidden />
              )}
              {isPublished ? t("saveChanges") : t("saveDraft")}
            </Button>
            {!isPublished && (
              <Button
                onClick={() => {
                  setShowErrors(true);
                  if (issues.length > 0) {
                    toast.error(t("fixErrors"));
                    return;
                  }
                  setDialog("publish");
                }}
                disabled={pending}
              >
                <Send aria-hidden />
                {t("publish")}
              </Button>
            )}
          </div>
        )}
      </div>

      {readOnly && (
        <Alert>
          <Info className="size-4" />
          <AlertDescription>{t("readOnly")}</AlertDescription>
        </Alert>
      )}
      {isPublished && canWrite && (
        <Alert>
          <Info className="size-4" />
          <AlertDescription>{t("publishedEditHint")}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("release.title")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="rn-version">{t("release.version")}</Label>
                <Input
                  id="rn-version"
                  value={form.version}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, version: e.target.value }))
                  }
                  placeholder="0.12.0"
                  className="font-mono"
                  disabled={readOnly}
                  aria-invalid={Boolean(issueFor("version"))}
                  spellCheck={false}
                />
                {issueFor("version") ? (
                  issueText(issueFor("version"))
                ) : (
                  <p className="text-muted-foreground text-xs">
                    {t("release.versionHint")}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rn-date">{t("release.date")}</Label>
                <Input
                  id="rn-date"
                  type="date"
                  value={form.released_on}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, released_on: e.target.value }))
                  }
                  disabled={readOnly}
                  aria-invalid={Boolean(issueFor("released_on"))}
                />
                {issueText(issueFor("released_on"))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("texts.title")}</CardTitle>
              <CardDescription>{t("texts.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Tabs
                value={locale}
                onValueChange={(v) => setLocale(v as ReleaseLocale)}
              >
                <TabsList className="w-full sm:w-fit">
                  {RELEASE_LOCALES.map((code) => (
                    <TabsTrigger
                      key={code}
                      value={code}
                      className="flex-1 sm:flex-none"
                    >
                      {LOCALE_NAMES[code]}
                      {REQUIRED_RELEASE_LOCALES.includes(code) ? (
                        <span
                          className="text-muted-foreground text-xs"
                          aria-hidden
                        >
                          *
                        </span>
                      ) : null}
                      {badLocales.has(code) && (
                        <span className="bg-destructive size-1.5 rounded-full">
                          <span className="sr-only">
                            {t("texts.hasErrors")}
                          </span>
                        </span>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <p className="text-muted-foreground text-xs">
                {REQUIRED_RELEASE_LOCALES.includes(locale)
                  ? t("texts.required")
                  : t("texts.optional")}
              </p>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="rn-title">{t("texts.releaseTitle")}</Label>
                  <Counter value={form.title[locale]} max={RELEASE_TITLE_MAX} />
                </div>
                <Input
                  id="rn-title"
                  lang={locale}
                  value={form.title[locale]}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={readOnly}
                  placeholder={
                    locale === "es" ? form.title.en || undefined : undefined
                  }
                  aria-invalid={Boolean(issueFor("title", locale))}
                />
                {issueText(issueFor("title", locale), RELEASE_TITLE_MAX)}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">
                    {t("items.title", {
                      count: form.items.length,
                      max: RELEASE_MAX_ITEMS,
                    })}
                  </h3>
                </div>
                {issueText(issueFor("items"))}
                <ol className="space-y-3">
                  {form.items.map((item, index) => {
                    const itemIssue = issueFor(`items.${index}`, locale);
                    const textId = `rn-item-${item.key}`;
                    return (
                      <li
                        key={item.key}
                        className="bg-muted/30 space-y-2 rounded-lg border p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-muted-foreground w-6 text-xs tabular-nums">
                            {index + 1}.
                          </span>
                          <Label htmlFor={`${textId}-kind`} className="sr-only">
                            {t("items.kind")}
                          </Label>
                          <NativeSelect
                            id={`${textId}-kind`}
                            value={item.kind}
                            onChange={(e) =>
                              setItem(index, {
                                kind: e.target.value as ReleaseItemKind,
                              })
                            }
                            disabled={readOnly}
                            wrapperClassName="w-36"
                          >
                            {RELEASE_ITEM_KINDS.map((kind) => (
                              <option key={kind} value={kind}>
                                {tKinds(kind)}
                              </option>
                            ))}
                          </NativeSelect>
                          {!readOnly && (
                            <div className="ml-auto flex gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                data-move={`${index}-up`}
                                onClick={() => move(index, index - 1)}
                                disabled={index === 0}
                                aria-label={t("items.moveUp", {
                                  index: index + 1,
                                })}
                                title={t("items.moveUp", { index: index + 1 })}
                              >
                                <ArrowUp />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                data-move={`${index}-down`}
                                onClick={() => move(index, index + 1)}
                                disabled={index === form.items.length - 1}
                                aria-label={t("items.moveDown", {
                                  index: index + 1,
                                })}
                                title={t("items.moveDown", {
                                  index: index + 1,
                                })}
                              >
                                <ArrowDown />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() =>
                                  setForm((p) => ({
                                    ...p,
                                    items: p.items.filter(
                                      (_, i) => i !== index,
                                    ),
                                  }))
                                }
                                disabled={form.items.length <= 1}
                                aria-label={t("items.remove", {
                                  index: index + 1,
                                })}
                                title={t("items.remove", { index: index + 1 })}
                              >
                                <X />
                              </Button>
                            </div>
                          )}
                        </div>
                        <Label htmlFor={textId} className="sr-only">
                          {t("items.text", { index: index + 1 })}
                        </Label>
                        <Textarea
                          id={textId}
                          lang={locale}
                          rows={2}
                          value={item.text[locale]}
                          onChange={(e) =>
                            setItem(index, { text: e.target.value })
                          }
                          disabled={readOnly}
                          placeholder={
                            locale === "es"
                              ? item.text.en || undefined
                              : t("items.placeholder")
                          }
                          aria-invalid={Boolean(itemIssue)}
                        />
                        <div className="flex items-start justify-between gap-2">
                          <div>{issueText(itemIssue, RELEASE_ITEM_MAX)}</div>
                          <Counter
                            value={item.text[locale]}
                            max={RELEASE_ITEM_MAX}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ol>
                {!readOnly && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        items: [...p.items, emptyReleaseItem()],
                      }))
                    }
                    disabled={form.items.length >= RELEASE_MAX_ITEMS}
                  >
                    <Plus aria-hidden />
                    {t("items.add")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <aside
          className="space-y-3 xl:sticky xl:top-0 xl:self-start"
          aria-label={t("preview.title")}
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">{t("preview.title")}</h2>
            <p className="text-muted-foreground text-xs">
              {t("preview.locale", { locale: LOCALE_NAMES[locale] })}
            </p>
          </div>
          <div className="bg-muted/30 rounded-xl border p-4">
            <ReleaseNotesList
              notes={[previewNote]}
              locale={locale}
              headingLevel="h3"
            />
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={dialog === "publish"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={t("confirmPublish.title", { version: payload.version })}
        description={t("confirmPublish.description")}
        confirmLabel={t("publish")}
        onConfirm={onPublish}
        pending={pending}
      >
        <div className="flex items-start justify-between gap-4 rounded-lg border px-3 py-2.5">
          <div className="space-y-0.5">
            <Label htmlFor="rn-notify">{t("confirmPublish.notify")}</Label>
            <p className="text-muted-foreground text-xs">
              {t("confirmPublish.notifyHint")}
            </p>
          </div>
          <Switch id="rn-notify" checked={notify} onCheckedChange={setNotify} />
        </div>
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === "unpublish"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={t("confirmUnpublish.title")}
        description={t("confirmUnpublish.description")}
        confirmLabel={t("unpublish")}
        onConfirm={onUnpublish}
        pending={pending}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={t("confirmDelete.title")}
        description={
          isPublished
            ? t("confirmDelete.descriptionPublished")
            : t("confirmDelete.description")
        }
        confirmLabel={t("delete")}
        destructive
        onConfirm={onDelete}
        pending={pending}
      />
      <ConfirmDialog
        open={guard.isConfirming}
        onOpenChange={(open) => !open && guard.cancelLeave()}
        title={t("leave.title")}
        description={t("leave.description")}
        confirmLabel={t("leave.confirm")}
        destructive
        onConfirm={guard.confirmLeave}
      />
    </div>
  );
}
