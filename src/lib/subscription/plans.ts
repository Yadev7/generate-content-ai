/**
 * Plan catalogue. Prices are in USD and are the single source of truth for
 * what the checkout flows charge.
 */
export const SUBSCRIPTION_CURRENCY = "USD";

export type BillingInterval = "month" | "year";
export type PlanId = "monthly" | "yearly";

export interface Plan {
  id: PlanId;
  interval: BillingInterval;
  /** Charge amount, e.g. "5.00". */
  amount: string;
  /** Number of days a period covers, used to compute `currentPeriodEnd`. */
  periodDays: number;
  /** Marketing blurb shown in the pricing dialog. */
  blurb: string;
}

export const PLANS: Record<PlanId, Plan> = {
  monthly: {
    id: "monthly",
    interval: "month",
    amount: "5.00",
    periodDays: 30,
    blurb: "Billed every month. Cancel any time.",
  },
  yearly: {
    id: "yearly",
    interval: "year",
    amount: "15.00",
    periodDays: 365,
    blurb: "Billed once a year. Two months free versus monthly.",
  },
};

export const DEFAULT_PLAN_ID: PlanId = "monthly";

/** English adverbs for non-UI copy (gateway descriptions, receipts). */
export const PLAN_LABELS: Record<PlanId, string> = {
  monthly: "monthly",
  yearly: "yearly",
};

/** Short product description sent to the payment gateway. */
export const planDescription = (plan: Plan): string =>
  `SAI Prime (${PLAN_LABELS[plan.id]})`;

export const isPlanId = (value: unknown): value is PlanId =>
  typeof value === "string" && Object.prototype.hasOwnProperty.call(PLANS, value);

export function getPlan(id: PlanId): Plan {
  return PLANS[id];
}

/** "5.00 USD" -> "$5" for display; "15.00 USD" -> "$15". */
export function formatPrice(amount: string, currency = SUBSCRIPTION_CURRENCY): string {
  const symbol = currency === "USD" ? "$" : `${currency} `;
  const [whole, fraction] = amount.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const decimals = fraction && fraction !== "00" ? `.${fraction}` : "";
  return `${symbol}${grouped}${decimals}`;
}
