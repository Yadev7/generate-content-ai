import type { BillingInterval, PlanId } from "./plans";

export type ProviderId = "paypal" | "payzone" | "mock";

export type SubscriptionStatus =
  | "active"
  | "cancelled"
  | "expired"
  | "refunded";

/** Stored on the user's Clerk `privateMetadata.subscription`. */
export interface Subscription {
  planId: PlanId;
  status: SubscriptionStatus;
  interval: BillingInterval;
  /** ISO timestamp; the subscription lapses after this. */
  currentPeriodEnd: string;
  provider: ProviderId;
  /** Provider-side reference, e.g. a PayPal capture id. Useful for refunds. */
  reference?: string;
  /**
   * Stable id for this single payment, so the same charge cannot be applied
   * twice. A payment reaches us from two directions (provider webhook and the
   * buyer's return trip) and both are legitimate; without this a single
   * purchase would extend the subscription twice.
   */
  idempotencyKey?: string;
  startedAt: string;
}

export interface SubscriptionStatusView {
  isSignedIn: boolean;
  isSubscribed: boolean;
  subscription: Subscription | null;
}

/** Normalised event produced after a provider confirms (or cancels) payment. */
export interface PaymentEvent {
  provider: ProviderId;
  /** Which user to credit. */
  userId: string;
  planId: PlanId;
  status: "paid" | "cancelled" | "refunded";
  reference?: string;
  /** See `Subscription.idempotencyKey`; dedupes duplicate deliveries. */
  idempotencyKey?: string;
  /** When the paid period ends, if the provider told us. */
  periodEnd?: string;
}
