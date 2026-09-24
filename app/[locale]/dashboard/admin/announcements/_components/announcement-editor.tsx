"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Archive,
  ArrowLeft,
  Bell,
  Loader2,
  Lock,
  Mail,
  PanelTop,
  Save,
  Send,
  SquareStack,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/components/nav-link";
import { ChoiceChips } from "@/components/staff/choice-chips";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import { AnnouncementBanner } from "@/components/announcements/announcement-banner";
import { AnnouncementModalContent } from "@/components/announcements/announcement-modal";
import { LEVEL_ICONS } from "@/components/announcements/announcement-parts";
import { NotificationItem } from "@/components/notifications/notification-item";
import { useMounted } from "@/hooks/use-mounted";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { useRouter } from "@/i18n/routing";
import { LOCALE_NAMES, type AppLocale } from "@/i18n/locales";
import { toastActionError } from "@/lib/action-toast";
import {
  AUDIENCE_PLAN_NONE,
  AUDIENCE_PLAN_TRIAL,
  BODY_MAX,
  CTA_LABEL_MAX,
  LEVEL_STYLES,
  STATUS_BADGE_STYLES,
  TITLE_MAX,
  announcementToForm,
  announcementToPayload,
  audienceKey,
  audienceOf,
  buildAnnouncementPatch,
  canArchive,
  editableFields,
  emptyAnnouncementForm,
  formToPayload,
  isFieldEditable,
  lockedFieldsIn,
  validateAnnouncementForm,
  type AnnouncementField,
  type AnnouncementForm,
} from "@/lib/announcements";
import { pickLocalized } from "@/lib/localized";
import { hasStaffCapability } from "@/lib/staff-permissions";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  ANNOUNCEMENT_LEVELS,
  type AdminAnnouncement,
  type AnnouncementLevel,
  type AudiencePayload,
} from "@/types/communication";
import type { PlanOption } from "@/lib/staff-data";
import {
  archiveAnnouncement,
  createAnnouncement,
  deleteAnnouncement,
  previewAudience,
  publishAnnouncement,
  updateAnnouncement,
} from "../actions";

const ROLES = ["user", "moderator", "admin"] as const;
const LOCALES: AppLocale[] = ["pt-BR", "en", "es"];
const AUDIENCE_DEBOUNCE_MS = 400;

function Counter({ value, max }: { value: string; max: number }) {
  const length = Array.from(value).length;
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

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function SwitchRow({
  id,
  icon: Icon,
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  icon?: LucideIcon;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border px-3 py-2.5">
      <div className="flex min-w-0 gap-2.5">
        {Icon && (
          <Icon
            className="text-muted-foreground mt-0.5 size-4 shrink-0"
            aria-hidden
          />
        )}
        <div className="space-y-0.5">
          <Label htmlFor={id} className="font-medium">
            {label}
          </Label>
          {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
        </div>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}

/** Live count of the accounts an audience matches (debounced). */
function useAudienceCount(form: AnnouncementForm) {
  const audience = audienceOf(form);
  const key = audienceKey(audience);
  const [state, setState] = useState<{ key: string; count: number | null }>({
    key: "",
    count: null,
  });
  const serialized = JSON.stringify(audience);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      previewAudience(JSON.parse(serialized) as AudiencePayload)
        .then((result) => {
          if (!cancelled) {
            setState({
              key,
              count: result.success ? (result.data ?? 0) : null,
            });
          }
        })
        .catch(() => undefined);
    }, AUDIENCE_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, serialized]);

  return { count: state.count, loading: state.key !== key };
}

interface AnnouncementEditorProps {
  announcement: AdminAnnouncement | null;
  plans: PlanOption[];
}

/**
 * The staff announcement editor. Rendered only in the browser: the
 * schedule fields are in the viewer's time zone, which the server can't
 * know (rendering them there would show the wrong times).
 */
export function AnnouncementEditor(props: AnnouncementEditorProps) {
  const mounted = useMounted();
  if (!mounted) {
    return (
      <div className="space-y-6" aria-busy="true">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
          <div className="space-y-6">
            <Skeleton className="h-72 w-full rounded-xl" />
            <Skeleton className="h-56 w-full rounded-xl" />
          </div>
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </div>
    );
  }
  return <Editor {...props} />;
}

function Editor({ announcement, plans }: AnnouncementEditorProps) {
  const t = useTranslations("announcements.editor");
  const tA = useTranslations("announcements");
  const locale = useLocale();
  const router = useRouter();
  const [saved, setSaved] = useState(announcement);
  const [form, setForm] = useState<AnnouncementForm>(() =>
    announcement ? announcementToForm(announcement) : emptyAnnouncementForm(),
  );
  const [baseline, setBaseline] = useState(() => JSON.stringify(form));
  const [showErrors, setShowErrors] = useState(false);
  const [dialog, setDialog] = useState<"publish" | "archive" | "delete" | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const [lockedError, setLockedError] = useState(false);

  const status = saved?.status ?? null;
  const editable = editableFields(status);
  const locked = editable === "none";
  const isDirty = JSON.stringify(form) !== baseline;
  const issues = validateAnnouncementForm(form);
  const audience = useAudienceCount(form);
  const guard = useUnsavedChangesGuard(isDirty && !pending);

  // Publishing and e-mailing an announcement are admin-only (the API
  // answers INSUFFICIENT_ROLE): moderators draft, an admin publishes.
  const { data: session } = useSession();
  const canPublish = hasStaffCapability(
    session?.user?.role,
    "announcements.publish",
  );
  const can = (field: AnnouncementField) =>
    isFieldEditable(status, field) &&
    (field !== "send_email" || canPublish || form.send_email);
  const set = <K extends keyof AnnouncementForm>(
    key: K,
    value: AnnouncementForm[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const payload = formToPayload(form);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const planOptions = [
    ...plans.map((plan) => ({
      value: plan.code,
      label: pickLocalized(plan.name, locale) || plan.code,
    })),
    { value: AUDIENCE_PLAN_TRIAL, label: t("audience.trial") },
    { value: AUDIENCE_PLAN_NONE, label: t("audience.none") },
  ];

  /** Saves the form; returns the saved announcement or null on failure. */
  const save = async (): Promise<AdminAnnouncement | null> => {
    setShowErrors(true);
    if (issues.length > 0) {
      toast.error(t("fixErrors"));
      return null;
    }
    if (!saved) {
      const result = await createAnnouncement(payload);
      if (!result.success || !result.data) {
        toastActionError(
          result,
          result.success ? t("saveFailed") : result.error,
        );
        return null;
      }
      return result.data;
    }
    const patch = buildAnnouncementPatch(announcementToPayload(saved), payload);
    if (Object.keys(patch).length === 0) return saved;
    if (lockedFieldsIn(patch, status).length > 0) {
      setLockedError(true);
      return null;
    }
    const result = await updateAnnouncement(saved.id, patch);
    if (!result.success || !result.data) {
      if (!result.success && result.apiCode === "ANNOUNCEMENT_LOCKED") {
        setLockedError(true);
      }
      toastActionError(result, result.success ? t("saveFailed") : result.error);
      return null;
    }
    return result.data;
  };

  const afterSave = (next: AdminAnnouncement, message: string) => {
    const nextForm = announcementToForm(next);
    setSaved(next);
    setForm(nextForm);
    setBaseline(JSON.stringify(nextForm));
    setShowErrors(false);
    setLockedError(false);
    toast.success(message);
    if (!saved) {
      guard.release();
      router.replace(`/dashboard/admin/announcements/${next.id}`);
    } else {
      router.refresh();
    }
  };

  const onSave = () =>
    startTransition(async () => {
      const next = await save();
      if (next) afterSave(next, t("saved"));
    });

  const onPublish = () =>
    startTransition(async () => {
      const current = await save();
      if (!current) {
        setDialog(null);
        return;
      }
      const result = await publishAnnouncement(current.id);
      setDialog(null);
      if (!result.success || !result.data) {
        toastActionError(
          result,
          result.success ? t("saveFailed") : result.error,
        );
        if (current !== saved) afterSave(current, t("saved"));
        return;
      }
      afterSave(result.data, t("published"));
    });

  const onArchive = () =>
    startTransition(async () => {
      if (!saved) return;
      const result = await archiveAnnouncement(saved.id);
      setDialog(null);
      if (!result.success || !result.data) {
        toastActionError(
          result,
          result.success ? t("saveFailed") : result.error,
        );
        return;
      }
      afterSave(result.data, t("archived"));
    });

  const onDelete = () =>
    startTransition(async () => {
      if (!saved) return;
      const result = await deleteAnnouncement(saved.id);
      if (!result.success) {
        setDialog(null);
        toastActionError(result, result.error);
        return;
      }
      guard.release();
      toast.success(t("deleted"));
      router.replace("/dashboard/admin/announcements");
    });

  const issueText = (field: string) => {
    if (!showErrors) return null;
    const map: Record<string, string[]> = {
      title: ["titleLength"],
      body: ["bodyLength"],
      cta: ["ctaIncomplete", "ctaLabelLength", "ctaUrl"],
      channels: ["noChannel"],
      window: ["windowOrder"],
    };
    const found = issues.find((issue) => map[field]?.includes(issue));
    return found ? (
      <p className="text-destructive text-xs" role="alert">
        {t(`issues.${found}`)}
      </p>
    ) : null;
  };

  const now = new Date().toISOString().replace("Z", "");
  const previewNotification = {
    type: "announcement" as const,
    data: {
      announcement_id: saved?.id ?? "preview",
      title: payload.title || tA("untitled"),
      level: payload.level,
    },
    created_at: now,
    read_at: null,
  };

  const channels = [
    payload.show_modal && t("channels.modal"),
    payload.show_banner && t("channels.banner"),
    payload.send_notification && t("channels.notification"),
    payload.send_email && t("channels.email"),
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/dashboard/admin/announcements">
              <ArrowLeft aria-hidden />
              {t("back")}
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {saved ? t("editTitle") : t("newTitle")}
            </h1>
            {status && (
              <Badge
                variant="outline"
                className={cn(STATUS_BADGE_STYLES[status])}
              >
                {tA(`status.${status}`)}
              </Badge>
            )}
            {isDirty && <Badge variant="secondary">{t("unsaved")}</Badge>}
          </div>
          {saved?.updated_by_username && (
            <p className="text-muted-foreground text-sm">
              {t("lastEditedBy", { username: saved.updated_by_username })}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {saved && status === "draft" && (
            <Button
              variant="ghost"
              onClick={() => setDialog("delete")}
              disabled={pending}
            >
              <Trash2 aria-hidden />
              {t("delete")}
            </Button>
          )}
          {saved && canArchive(status) && (
            <Button
              variant="outline"
              onClick={() => setDialog("archive")}
              disabled={pending}
            >
              <Archive aria-hidden />
              {t("archive")}
            </Button>
          )}
          {!locked && (
            <Button
              variant="outline"
              onClick={onSave}
              disabled={pending || (!isDirty && !!saved)}
            >
              {pending && dialog === null ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <Save aria-hidden />
              )}
              {status === null || status === "draft"
                ? t("saveDraft")
                : t("save")}
            </Button>
          )}
          {(status === null || status === "draft") && !canPublish && (
            <p className="text-muted-foreground max-w-56 text-xs">
              {t("publishAdminOnly")}
            </p>
          )}
          {(status === null || status === "draft") && canPublish && (
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
      </div>

      {(locked || status === "active" || lockedError) && (
        <Alert variant={lockedError ? "destructive" : "default"}>
          <Lock className="size-4" />
          <AlertTitle>
            {locked ? t("locked.titleClosed") : t("locked.titleActive")}
          </AlertTitle>
          <AlertDescription>
            {locked ? t("locked.closed") : t("locked.active")}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className="space-y-6">
          <Section
            title={t("content.title")}
            description={t("content.description")}
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="a-title">{t("content.titleField")}</Label>
                <Counter value={form.title} max={TITLE_MAX} />
              </div>
              <Input
                id="a-title"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                disabled={!can("title")}
                aria-invalid={showErrors && issues.includes("titleLength")}
                maxLength={TITLE_MAX + 20}
              />
              {issueText("title")}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="a-body">{t("content.body")}</Label>
                <Counter value={form.body} max={BODY_MAX} />
              </div>
              <Textarea
                id="a-body"
                value={form.body}
                rows={7}
                onChange={(e) => set("body", e.target.value)}
                disabled={!can("body")}
                aria-invalid={showErrors && issues.includes("bodyLength")}
                aria-describedby="a-body-hint"
              />
              <p id="a-body-hint" className="text-muted-foreground text-xs">
                {t("content.bodyHint")}
              </p>
              {issueText("body")}
            </div>
            <fieldset className="space-y-2" disabled={!can("level")}>
              <legend className="mb-1.5 text-sm font-medium">
                {t("content.level")}
              </legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {ANNOUNCEMENT_LEVELS.map((level) => {
                  const Icon = LEVEL_ICONS[level];
                  const selected = form.level === level;
                  return (
                    <label
                      key={level}
                      className={cn(
                        "has-[:focus-visible]:ring-ring/50 flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors has-disabled:cursor-not-allowed has-disabled:opacity-60 has-[:focus-visible]:ring-3",
                        selected
                          ? cn(
                              LEVEL_STYLES[level].surface,
                              LEVEL_STYLES[level].border,
                              "font-medium",
                            )
                          : "hover:bg-muted",
                      )}
                    >
                      <input
                        type="radio"
                        name="a-level"
                        value={level}
                        checked={selected}
                        onChange={() =>
                          set("level", level as AnnouncementLevel)
                        }
                        className="sr-only"
                      />
                      <Icon
                        className={cn("size-4", LEVEL_STYLES[level].icon)}
                        aria-hidden
                      />
                      {tA(`levels.${level}`)}
                    </label>
                  );
                })}
              </div>
              <p className="text-muted-foreground text-xs">
                {t(`content.levelHints.${form.level}`)}
              </p>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="a-cta-label">{t("content.ctaLabel")}</Label>
                  <Counter value={form.cta_label} max={CTA_LABEL_MAX} />
                </div>
                <Input
                  id="a-cta-label"
                  value={form.cta_label}
                  onChange={(e) => set("cta_label", e.target.value)}
                  disabled={!can("cta_label")}
                  placeholder={t("content.ctaLabelPlaceholder")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a-cta-url">{t("content.ctaUrl")}</Label>
                <Input
                  id="a-cta-url"
                  value={form.cta_url}
                  onChange={(e) => set("cta_url", e.target.value)}
                  disabled={!can("cta_url")}
                  placeholder="/dashboard/settings"
                  inputMode="url"
                  spellCheck={false}
                />
              </div>
              <p className="text-muted-foreground text-xs sm:col-span-2">
                {t("content.ctaHint")}
              </p>
              <div className="sm:col-span-2">{issueText("cta")}</div>
            </div>
          </Section>

          <Section
            title={t("channels.title")}
            description={t("channels.description")}
          >
            <SwitchRow
              id="a-modal"
              icon={SquareStack}
              label={t("channels.modal")}
              hint={t("channels.modalHint")}
              checked={payload.show_modal}
              onChange={(v) => set("show_modal", v)}
              disabled={!can("show_modal") || form.requires_acknowledgement}
            />
            <SwitchRow
              id="a-banner"
              icon={PanelTop}
              label={t("channels.banner")}
              hint={t("channels.bannerHint")}
              checked={form.show_banner}
              onChange={(v) => set("show_banner", v)}
              disabled={!can("show_banner")}
            />
            <SwitchRow
              id="a-notification"
              icon={Bell}
              label={t("channels.notification")}
              hint={t("channels.notificationHint")}
              checked={form.send_notification}
              onChange={(v) => set("send_notification", v)}
              disabled={!can("send_notification")}
            />
            <SwitchRow
              id="a-email"
              icon={Mail}
              label={t("channels.email")}
              hint={
                !canPublish
                  ? t("channels.emailAdminOnly")
                  : form.level === "critical"
                    ? t("channels.emailCriticalHint")
                    : t("channels.emailHint")
              }
              checked={form.send_email}
              onChange={(v) => set("send_email", v)}
              disabled={!can("send_email")}
            />
            {issueText("channels")}
          </Section>

          <Section
            title={t("behavior.title")}
            description={t("behavior.description")}
          >
            <SwitchRow
              id="a-ack"
              label={t("behavior.requiresAck")}
              hint={t("behavior.requiresAckHint")}
              checked={form.requires_acknowledgement}
              onChange={(v) =>
                setForm((prev) => ({
                  ...prev,
                  requires_acknowledgement: v,
                  show_modal: v ? true : prev.show_modal,
                }))
              }
              disabled={!can("requires_acknowledgement")}
            />
            <SwitchRow
              id="a-dismissible"
              label={t("behavior.dismissible")}
              hint={
                form.requires_acknowledgement
                  ? t("behavior.dismissibleAckHint")
                  : t("behavior.dismissibleHint")
              }
              checked={payload.dismissible}
              onChange={(v) => set("dismissible", v)}
              disabled={!can("dismissible") || form.requires_acknowledgement}
            />
          </Section>

          <Section
            title={t("audience.title")}
            description={t("audience.description")}
          >
            <div className="space-y-2">
              <Label className="text-sm">{t("audience.roles")}</Label>
              <ChoiceChips
                label={t("audience.roles")}
                options={ROLES.map((role) => ({
                  value: role,
                  label: t(`audience.roleNames.${role}`),
                }))}
                value={form.audience_roles}
                onChange={(v) => set("audience_roles", v)}
                disabled={!can("audience_roles")}
                emptyLabel={t("audience.everyRole")}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{t("audience.plans")}</Label>
              <ChoiceChips
                label={t("audience.plans")}
                options={planOptions}
                value={form.audience_plans}
                onChange={(v) => set("audience_plans", v)}
                disabled={!can("audience_plans")}
                emptyLabel={t("audience.everyPlan")}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{t("audience.locales")}</Label>
              <ChoiceChips
                label={t("audience.locales")}
                options={LOCALES.map((code) => ({
                  value: code,
                  label: LOCALE_NAMES[code],
                }))}
                value={form.audience_locales}
                onChange={(v) => set("audience_locales", v)}
                disabled={!can("audience_locales")}
                emptyLabel={t("audience.everyLocale")}
              />
            </div>
            <div
              className="bg-muted/50 flex items-center gap-3 rounded-lg border px-3 py-2.5"
              aria-live="polite"
            >
              <Users className="text-muted-foreground size-4" aria-hidden />
              <p className="text-sm">
                {audience.count === null ? (
                  audience.loading ? (
                    <span className="text-muted-foreground">
                      {t("audience.counting")}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      {t("audience.countUnavailable")}
                    </span>
                  )
                ) : (
                  <>
                    <span className="font-semibold tabular-nums">
                      {t("audience.count", { count: audience.count })}
                    </span>
                    {audience.loading && (
                      <Loader2
                        className="text-muted-foreground ml-2 inline size-3.5 animate-spin"
                        aria-hidden
                      />
                    )}
                  </>
                )}
              </p>
            </div>
          </Section>

          <Section
            title={t("schedule.title")}
            description={t("schedule.description", { timeZone })}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="a-start">{t("schedule.start")}</Label>
                <Input
                  id="a-start"
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => set("starts_at", e.target.value)}
                  disabled={!can("starts_at")}
                />
                <p className="text-muted-foreground text-xs">
                  {t("schedule.startHint")}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a-end">{t("schedule.end")}</Label>
                <Input
                  id="a-end"
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(e) => set("ends_at", e.target.value)}
                  disabled={!can("ends_at")}
                  aria-invalid={showErrors && issues.includes("windowOrder")}
                />
                <p className="text-muted-foreground text-xs">
                  {t("schedule.endHint")}
                </p>
              </div>
            </div>
            {issueText("window")}
          </Section>
        </div>

        <aside
          className="space-y-3 lg:sticky lg:top-0 lg:self-start"
          aria-label={t("preview.title")}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">{t("preview.title")}</h2>
            <p className="text-muted-foreground text-xs">
              {channels.length ? channels.join(" · ") : t("preview.noChannels")}
            </p>
          </div>
          <Tabs defaultValue="modal">
            <TabsList className="w-full">
              <TabsTrigger value="modal" className="flex-1">
                {t("preview.modal")}
              </TabsTrigger>
              <TabsTrigger value="banner" className="flex-1">
                {t("preview.banner")}
              </TabsTrigger>
              <TabsTrigger value="notification" className="flex-1">
                {t("preview.notification")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="modal">
              <div className="bg-foreground/10 dark:bg-foreground/5 rounded-xl border p-4">
                <div className="bg-background rounded-lg border p-5 shadow-lg">
                  <AnnouncementModalContent
                    announcement={{
                      ...payload,
                      title: payload.title,
                    }}
                    onConfirm={() => undefined}
                    onNavigate={() => undefined}
                  />
                </div>
              </div>
              {!payload.show_modal && (
                <p className="text-muted-foreground mt-2 text-xs">
                  {t("preview.channelOff")}
                </p>
              )}
            </TabsContent>
            <TabsContent value="banner">
              <div className="bg-background overflow-hidden rounded-xl border">
                <AnnouncementBanner
                  announcement={payload}
                  onDismiss={() => undefined}
                  className="md:px-4"
                />
                <div className="space-y-2 p-4" aria-hidden>
                  <div className="bg-muted h-4 w-1/2 rounded" />
                  <div className="bg-muted/70 h-3 w-3/4 rounded" />
                  <div className="bg-muted/70 h-3 w-2/3 rounded" />
                </div>
              </div>
              {!payload.show_banner && (
                <p className="text-muted-foreground mt-2 text-xs">
                  {t("preview.channelOff")}
                </p>
              )}
            </TabsContent>
            <TabsContent value="notification">
              <div className="bg-popover w-full max-w-80 overflow-hidden rounded-xl border shadow-md">
                <p className="border-b px-3 py-2.5 text-sm font-semibold">
                  {t("preview.notificationsTitle")}
                </p>
                <NotificationItem notification={previewNotification} />
              </div>
              {!payload.send_notification && (
                <p className="text-muted-foreground mt-2 text-xs">
                  {t("preview.channelOff")}
                </p>
              )}
            </TabsContent>
          </Tabs>
        </aside>
      </div>

      <ConfirmDialog
        open={dialog === "publish"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={t("confirmPublish.title")}
        description={
          <div className="space-y-2">
            <p>
              {audience.count === null
                ? t("confirmPublish.audienceUnknown")
                : t("confirmPublish.audience", { count: audience.count })}
            </p>
            <p>
              {t("confirmPublish.channels", { channels: channels.join(", ") })}
            </p>
            <p>
              {payload.starts_at
                ? t("confirmPublish.scheduled")
                : t("confirmPublish.immediate")}
            </p>
          </div>
        }
        confirmLabel={t("publish")}
        onConfirm={onPublish}
        pending={pending}
      />
      <ConfirmDialog
        open={dialog === "archive"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={t("confirmArchive.title")}
        description={t("confirmArchive.description")}
        confirmLabel={t("archive")}
        onConfirm={onArchive}
        pending={pending}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={t("confirmDelete.title")}
        description={t("confirmDelete.description")}
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
