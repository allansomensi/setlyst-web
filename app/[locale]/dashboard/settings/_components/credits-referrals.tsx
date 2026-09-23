"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Coins, Copy, Gift, Loader2, Share2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import { useAppRouter } from "@/hooks/use-app-router";
import { useMounted } from "@/hooks/use-mounted";
import {
  loadCreditHistory,
  loadReferrals,
  redeemReward,
} from "@/lib/actions/billing";
import { toastActionError } from "@/lib/action-toast";
import { copyText } from "@/lib/clipboard";
import { formatApiDate } from "@/lib/dates";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { CreditEntry, ReferralEntry } from "@/types/account";
import type { BillingMe, CreditReward } from "@/types/billing";
import type { PaginatedResponse } from "@/types/api";

const CREDIT_REASONS = [
  "referral_referrer",
  "referral_referred",
  "promo_code",
  "reward_redemption",
  "admin_adjustment",
];

/** A paginated list that grows with "Carregar mais". */
function usePagedList<T>(
  initial: PaginatedResponse<T> | null,
  load: (
    page: number,
  ) => Promise<
    | { success: true; data?: PaginatedResponse<T> }
    | { success: false; error: string }
  >,
) {
  const [items, setItems] = useState<T[]>(initial?.data ?? []);
  const [page, setPage] = useState(initial?.meta.current_page ?? 1);
  const [totalPages, setTotalPages] = useState(initial?.meta.total_pages ?? 0);
  const [loading, setLoading] = useState(false);

  const loadMore = async () => {
    setLoading(true);
    const result = await load(page + 1);
    setLoading(false);
    if (!result.success || !result.data) {
      if (!result.success) toastActionError(result, result.error);
      return;
    }
    setItems((current) => [...current, ...result.data!.data]);
    setPage(result.data.meta.current_page);
    setTotalPages(result.data.meta.total_pages);
  };

  return { items, hasMore: page < totalPages, loading, loadMore };
}

// ---------------------------------------------------------------------
// Credits
// ---------------------------------------------------------------------

export function CreditsCard({
  balance,
  rewards,
  initialHistory,
  planName,
  disabled,
}: {
  balance: number;
  rewards: CreditReward[];
  initialHistory: PaginatedResponse<CreditEntry> | null;
  planName: (code: string | null | undefined) => string;
  disabled: boolean;
}) {
  const t = useTranslations("billing.credits");
  const locale = useLocale();
  const router = useAppRouter();
  const [confirming, setConfirming] = useState<CreditReward | null>(null);
  const [pending, setPending] = useState(false);
  const history = usePagedList(initialHistory, loadCreditHistory);
  const number = new Intl.NumberFormat(locale);

  const redeem = async () => {
    if (!confirming) return;
    setPending(true);
    const result = await redeemReward(confirming.id);
    setPending(false);
    if (!result.success) {
      toastActionError(result, result.error);
      return;
    }
    toast.success(
      t("redeemed", { days: confirming.days, plan: planName(confirming.plan) }),
    );
    setConfirming(null);
    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="text-primary size-4" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tabular-nums">
            {number.format(balance)}
          </span>
          <span className="text-muted-foreground text-sm">
            {t("balanceLabel", { count: balance })}
          </span>
        </div>

        {rewards.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("rewards")}</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {rewards.map((reward) => {
                const affordable = balance >= reward.cost;
                return (
                  <li
                    key={reward.id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {t("rewardName", {
                          days: reward.days,
                          plan: planName(reward.plan),
                        })}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {t("cost", { count: reward.cost })}
                        {!affordable && (
                          <>
                            {" · "}
                            {t("missing", { count: reward.cost - balance })}
                          </>
                        )}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={affordable ? "default" : "outline"}
                      disabled={!affordable || disabled}
                      onClick={() => setConfirming(reward)}
                    >
                      {t("redeem")}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium">{t("historyTitle")}</p>
          {history.items.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
              {t("empty")}
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60">
                    <TableHead>{t("date")}</TableHead>
                    <TableHead>{t("reason")}</TableHead>
                    <TableHead className="text-right">{t("amount")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.items.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {formatApiDate(entry.created_at, locale)}
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        {CREDIT_REASONS.includes(entry.reason)
                          ? t(`reasons.${entry.reason}`)
                          : t("reasons.other")}
                        {entry.note && (
                          <span className="text-muted-foreground block text-xs">
                            {entry.note}
                          </span>
                        )}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-medium tabular-nums",
                          entry.amount > 0
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-muted-foreground",
                        )}
                      >
                        {entry.amount > 0 ? "+" : ""}
                        {number.format(entry.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {history.hasMore && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void history.loadMore()}
              disabled={history.loading}
            >
              {history.loading && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              {t("loadMore")}
            </Button>
          )}
        </div>
      </CardContent>

      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(open) => !open && setConfirming(null)}
        title={t("confirmTitle")}
        description={
          confirming
            ? t("confirmDescription", {
                cost: confirming.cost,
                days: confirming.days,
                plan: planName(confirming.plan),
              })
            : undefined
        }
        confirmLabel={t("confirmAction")}
        onConfirm={() => void redeem()}
        pending={pending}
      />
    </Card>
  );
}

// ---------------------------------------------------------------------
// Referrals
// ---------------------------------------------------------------------

const REFERRAL_STATUS_STYLES: Record<ReferralEntry["status"], string> = {
  pending: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  rewarded: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  rejected: "bg-muted text-muted-foreground",
};

export function ReferralCard({
  referral,
  initialReferrals,
}: {
  referral: BillingMe["referral"];
  initialReferrals: PaginatedResponse<ReferralEntry> | null;
}) {
  const t = useTranslations("billing.referral");
  const locale = useLocale();
  const [copied, setCopied] = useState(false);
  const list = usePagedList(initialReferrals, loadReferrals);
  const mounted = useMounted();

  // Built on the client: the page may be served from any origin (preview
  // deployments, the PWA), and the link must point where it was opened.
  const link =
    referral.link_path && mounted
      ? new URL(referral.link_path, window.location.origin).toString()
      : (referral.link_path ?? "");

  const canShare = mounted && typeof navigator.share === "function";

  const copy = async () => {
    if (!link) return;
    if (await copyText(link)) {
      setCopied(true);
      toast.success(t("copied"));
      window.setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error(t("copyFailed"));
    }
  };

  const share = async () => {
    try {
      await navigator.share({
        title: t("shareTitle"),
        text: t("shareText"),
        url: link,
      });
    } catch {
      // Cancelled by the person: nothing to do.
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="text-primary size-4" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {referral.code ? (
          <div className="space-y-2">
            <label htmlFor="referral-link" className="text-sm font-medium">
              {t("linkLabel")}
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="referral-link"
                readOnly
                value={link}
                onFocus={(e) => e.currentTarget.select()}
                className="h-10 font-mono text-xs sm:text-sm"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 flex-1"
                  onClick={copy}
                >
                  {copied ? (
                    <Check className="mr-2 size-4" />
                  ) : (
                    <Copy className="mr-2 size-4" />
                  )}
                  {t("copy")}
                </Button>
                {canShare && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 flex-1"
                    onClick={share}
                  >
                    <Share2 className="mr-2 size-4" />
                    {t("share")}
                  </Button>
                )}
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              {t("codeLabel")}{" "}
              <span className="text-foreground font-mono font-medium tracking-wider">
                {referral.code}
              </span>
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">{t("noCode")}</p>
        )}

        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border p-3">
            <dt className="text-muted-foreground text-xs">{t("rewarded")}</dt>
            <dd className="text-2xl font-semibold tabular-nums">
              {referral.rewarded_count}
            </dd>
          </div>
          <div className="rounded-lg border p-3">
            <dt className="text-muted-foreground text-xs">{t("pending")}</dt>
            <dd className="text-2xl font-semibold tabular-nums">
              {referral.pending_count}
            </dd>
          </div>
        </dl>

        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Users className="size-4" />
            {t("listTitle")}
          </p>
          {list.items.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
              {t("empty")}
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60">
                    <TableHead>{t("user")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      {t("joined")}
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      {t("rewardedAt")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.items.map((entry) => (
                    <TableRow key={`${entry.username}-${entry.created_at}`}>
                      <TableCell className="font-medium">
                        @{entry.username}
                      </TableCell>
                      <TableCell>
                        <Badge className={REFERRAL_STATUS_STYLES[entry.status]}>
                          {t(`statuses.${entry.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden sm:table-cell">
                        {formatApiDate(entry.created_at, locale)}
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden sm:table-cell">
                        {entry.rewarded_at
                          ? formatApiDate(entry.rewarded_at, locale)
                          : ""}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {list.hasMore && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void list.loadMore()}
              disabled={list.loading}
            >
              {list.loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("loadMore")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
