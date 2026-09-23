"use client";

import { useEffect, useState, useTransition } from "react";
import { Dices, Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { ClientDate } from "@/components/client-date";
import { Link } from "@/components/nav-link";
import { useRouter } from "@/i18n/routing";
import { toastActionError } from "@/lib/action-toast";
import {
  generatePromoCode,
  PROMO_CODE_PATTERN,
  PROMO_KIND_FIELDS,
} from "@/lib/billing-admin";
import {
  isBeforeUtc,
  localInputToUtcNaive,
  utcNaiveToLocalInput,
} from "@/lib/datetime-local";
import { onFormSubmit } from "@/lib/forms";
import { toast } from "@/lib/toast";
import {
  PROMO_KINDS,
  type PromoCode,
  type PromoKind,
  type PromoRedemption,
} from "@/types/staff";
import {
  createPromoCode,
  getPromoRedemptions,
  updatePromoCode,
} from "../../billing/actions";

export interface PlanChoice {
  code: string;
  name: string;
}

function intOrNull(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : Number.NaN;
}

function inRange(value: number | null, min: number, max: number) {
  return value !== null && !Number.isNaN(value) && value >= min && value <= max;
}

// ------------------------------------------------------------------ create

export function CreatePromoCodeButton({ plans }: { plans: PlanChoice[] }) {
  const t = useTranslations("billingAdmin.promoCodes");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus aria-hidden />
        {t("new")}
      </Button>
      {open && (
        <CreatePromoCodeDialog plans={plans} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function CreatePromoCodeDialog({
  plans,
  onClose,
}: {
  plans: PlanChoice[];
  onClose: () => void;
}) {
  const t = useTranslations("billingAdmin.promoCodes");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<PromoKind>("plan_grant");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [plan, setPlan] = useState(plans[0]?.code ?? "");
  const [days, setDays] = useState("30");
  const [credits, setCredits] = useState("50");
  const [discount, setDiscount] = useState("20");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [newUsersOnly, setNewUsersOnly] = useState(false);
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  const fields = PROMO_KIND_FIELDS[kind];
  const daysValue = intOrNull(days);
  const creditsValue = intOrNull(credits);
  const discountValue = intOrNull(discount);
  const maxValue = intOrNull(maxRedemptions);
  const startsUtc = localInputToUtcNaive(startsAt);
  const expiresUtc = localInputToUtcNaive(expiresAt);

  const errors = {
    code: code.trim() !== "" && !PROMO_CODE_PATTERN.test(code.trim()),
    plan: fields.plan && !plan,
    days: fields.days && !inRange(daysValue, 1, 3650),
    credits: fields.credits && !inRange(creditsValue, 1, 100_000),
    discount: fields.discount && !inRange(discountValue, 1, 100),
    max: maxValue !== null && !inRange(maxValue, 1, 1_000_000),
    window: Boolean(
      startsUtc && expiresUtc && !isBeforeUtc(startsUtc, expiresUtc),
    ),
  };
  const valid =
    !Object.values(errors).some(Boolean) && description.length <= 255;
  const err = (flag: boolean) => showErrors && flag;

  const submit = () => {
    setShowErrors(true);
    if (!valid) return;
    startTransition(async () => {
      const result = await createPromoCode({
        code: code.trim() ? code.trim().toUpperCase() : null,
        description: description.trim() || null,
        kind,
        plan_code: fields.plan ? plan : null,
        duration_days: fields.days ? daysValue : null,
        credits: fields.credits ? creditsValue : null,
        discount_percent: fields.discount ? discountValue : null,
        max_redemptions: maxValue,
        new_users_only: newUsersOnly,
        starts_at: startsUtc,
        expires_at: expiresUtc,
      });
      if (!result.success || !result.data) {
        toastActionError(
          result,
          result.success ? t("saveFailed") : result.error,
        );
        return;
      }
      toast.success(t("created", { code: result.data.code }));
      onClose();
      router.refresh();
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("createTitle")}</DialogTitle>
          <DialogDescription>{t("createDescription")}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onFormSubmit(submit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="promo-code">{t("fields.code")}</Label>
            <div className="flex gap-2">
              <Input
                id="promo-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="font-mono uppercase"
                placeholder={t("fields.codePlaceholder")}
                maxLength={32}
                aria-invalid={err(errors.code)}
                spellCheck={false}
                autoComplete="off"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setCode(generatePromoCode("SETLYST"))}
              >
                <Dices aria-hidden />
                {t("fields.generate")}
              </Button>
            </div>
            <p
              className={
                err(errors.code)
                  ? "text-destructive text-xs"
                  : "text-muted-foreground text-xs"
              }
            >
              {t("fields.codeHint")}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="promo-description">{t("fields.description")}</Label>
            <Input
              id="promo-description"
              value={description}
              maxLength={255}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("fields.descriptionPlaceholder")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="promo-kind">{t("fields.kind")}</Label>
            <NativeSelect
              id="promo-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as PromoKind)}
            >
              {PROMO_KINDS.map((value) => (
                <option key={value} value={value}>
                  {t(`kinds.${value}`)}
                </option>
              ))}
            </NativeSelect>
            <p className="text-muted-foreground text-xs">
              {t(`kindHints.${kind}`)}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.plan && (
              <div className="space-y-1.5">
                <Label htmlFor="promo-plan">{t("fields.plan")}</Label>
                <NativeSelect
                  id="promo-plan"
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  aria-invalid={err(errors.plan)}
                >
                  {plans.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            )}
            {fields.days && (
              <div className="space-y-1.5">
                <Label htmlFor="promo-days">{t("fields.days")}</Label>
                <Input
                  id="promo-days"
                  type="number"
                  min={1}
                  max={3650}
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  aria-invalid={err(errors.days)}
                />
              </div>
            )}
            {fields.credits && (
              <div className="space-y-1.5">
                <Label htmlFor="promo-credits">{t("fields.credits")}</Label>
                <Input
                  id="promo-credits"
                  type="number"
                  min={1}
                  max={100000}
                  value={credits}
                  onChange={(e) => setCredits(e.target.value)}
                  aria-invalid={err(errors.credits)}
                />
              </div>
            )}
            {fields.discount && (
              <div className="space-y-1.5">
                <Label htmlFor="promo-discount">{t("fields.discount")}</Label>
                <Input
                  id="promo-discount"
                  type="number"
                  min={1}
                  max={100}
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  aria-invalid={err(errors.discount)}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="promo-max">{t("fields.maxRedemptions")}</Label>
              <Input
                id="promo-max"
                type="number"
                min={1}
                value={maxRedemptions}
                onChange={(e) => setMaxRedemptions(e.target.value)}
                placeholder={t("fields.unlimited")}
                aria-invalid={err(errors.max)}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="promo-starts">{t("fields.startsAt")}</Label>
              <Input
                id="promo-starts"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                {t("fields.startsHint")}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="promo-expires">{t("fields.expiresAt")}</Label>
              <Input
                id="promo-expires"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                aria-invalid={err(errors.window)}
              />
              <p
                className={
                  err(errors.window)
                    ? "text-destructive text-xs"
                    : "text-muted-foreground text-xs"
                }
              >
                {err(errors.window)
                  ? t("fields.windowError")
                  : t("fields.expiresHint")}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5">
            <div>
              <Label htmlFor="promo-new-users">
                {t("fields.newUsersOnly")}
              </Label>
              <p className="text-muted-foreground text-xs">
                {t("fields.newUsersOnlyHint")}
              </p>
            </div>
            <Switch
              id="promo-new-users"
              checked={newUsersOnly}
              onCheckedChange={setNewUsersOnly}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={pending}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" aria-hidden />}
              {t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// -------------------------------------------------------------------- edit

export function EditPromoCodeDialog({
  promo,
  onClose,
}: {
  promo: PromoCode;
  onClose: () => void;
}) {
  const t = useTranslations("billingAdmin.promoCodes");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [description, setDescription] = useState(promo.description ?? "");
  const [expiresAt, setExpiresAt] = useState(() =>
    utcNaiveToLocalInput(promo.expires_at),
  );
  const [maxRedemptions, setMaxRedemptions] = useState(
    promo.max_redemptions === null ? "" : String(promo.max_redemptions),
  );
  const maxValue = intOrNull(maxRedemptions);
  const maxInvalid =
    maxValue !== null &&
    (!inRange(maxValue, 1, 1_000_000) || maxValue < promo.redemptions_count);

  const submit = () => {
    if (maxInvalid) return;
    startTransition(async () => {
      const result = await updatePromoCode(promo.id, {
        description: description.trim() || null,
        expires_at: localInputToUtcNaive(expiresAt),
        max_redemptions: maxValue,
      });
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      toast.success(t("updated"));
      onClose();
      router.refresh();
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("editTitle", { code: promo.code })}</DialogTitle>
          <DialogDescription>{t("editDescription")}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onFormSubmit(submit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="edit-promo-description">
              {t("fields.description")}
            </Label>
            <Input
              id="edit-promo-description"
              value={description}
              maxLength={255}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-promo-expires">{t("fields.expiresAt")}</Label>
            <Input
              id="edit-promo-expires"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              {t("fields.expiresHint")}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-promo-max">{t("fields.maxRedemptions")}</Label>
            <Input
              id="edit-promo-max"
              type="number"
              min={Math.max(1, promo.redemptions_count)}
              value={maxRedemptions}
              onChange={(e) => setMaxRedemptions(e.target.value)}
              placeholder={t("fields.unlimited")}
              aria-invalid={maxInvalid}
            />
            <p
              className={
                maxInvalid
                  ? "text-destructive text-xs"
                  : "text-muted-foreground text-xs"
              }
            >
              {t("fields.maxHint", { count: promo.redemptions_count })}
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={pending}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending || maxInvalid}>
              {pending && <Loader2 className="animate-spin" aria-hidden />}
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------- redemptions

export function RedemptionsDialog({
  promo,
  onClose,
}: {
  promo: PromoCode;
  onClose: () => void;
}) {
  const t = useTranslations("billingAdmin.promoCodes");
  const [items, setItems] = useState<PromoRedemption[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPromoRedemptions(promo.id).then((result) => {
      if (cancelled) return;
      if (result.success) setItems(result.data ?? []);
      else setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [promo.id]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("redemptionsTitle", { code: promo.code })}
          </DialogTitle>
          <DialogDescription>
            {t("redemptionsDescription", { count: promo.redemptions_count })}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto">
          {failed ? (
            <p className="text-destructive text-sm">{t("redemptionsFailed")}</p>
          ) : items === null ? (
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {t("loading")}
            </p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t("redemptionsEmpty")}
            </p>
          ) : (
            <ul className="divide-y text-sm">
              {items.map((r) => (
                <li
                  key={`${r.user_id}-${r.redeemed_at}`}
                  className="flex justify-between gap-3 py-2"
                >
                  <Link
                    href={`/dashboard/users/${r.user_id}`}
                    className="font-medium hover:underline"
                  >
                    @{r.username}
                  </Link>
                  <ClientDate
                    value={r.redeemed_at}
                    className="text-muted-foreground text-xs"
                    options={{ dateStyle: "medium", timeStyle: "short" }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
