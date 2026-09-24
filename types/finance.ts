/** `GET /admin/finance` (admin): revenue, subscribers and payments. */

export interface PlanRevenue {
  plan_code: string;
  interval: "monthly" | "yearly" | (string & {});
  subscribers: number;
  mrr_cents: number;
}

export interface MonthRevenue {
  /** `YYYY-MM`, in `time_zone`. */
  month: string;
  gross_cents: number;
  refunded_cents: number;
  net_cents: number;
  payments: number;
  new_subscribers: number;
  churned: number;
}

export interface PaymentRow {
  id: string;
  invoice_id: string;
  /** Naive UTC. */
  paid_at: string;
  user_id: string | null;
  username: string | null;
  plan_code: string | null;
  interval: string | null;
  amount_cents: number;
  refunded_cents: number;
  currency: string;
}

export interface FinanceOverview {
  enforced: boolean;
  payments_enabled: boolean;
  currency: string;
  time_zone: string;
  mrr_cents: number;
  arr_cents: number;
  arpu_cents: number;
  paying_subscribers: number;
  by_plan: PlanRevenue[];
  trialing: number;
  trials_ending_7_days: number;
  cancel_scheduled: number;
  past_due: number;
  new_subscribers_this_month: number;
  churned_this_month: number;
  churn_rate_this_month: number;
  revenue: {
    this_month_cents: number;
    last_month_cents: number;
    last_12_months_cents: number;
    all_time_cents: number;
    refunded_this_month_cents: number;
  };
  trial_conversion: {
    window_days: number;
    ended_trials: number;
    converted: number;
    rate: number;
  };
  monthly: MonthRevenue[];
  recent_payments: PaymentRow[];
  last_payment_at: string | null;
}

export interface FinanceSyncResult {
  scanned: number;
  imported: number;
  refunds_applied: number;
  /** False while there is more to read: call again with `cursor`. */
  done: boolean;
  cursor: string | null;
}
