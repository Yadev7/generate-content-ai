import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

import { PLANS, isPlanId } from "./plans";
import type { PaymentEvent, Subscription, SubscriptionStatusView } from "./types";

/**
 * Entitlements live in the user's Clerk `privateMetadata` rather than a
 * separate database: it keeps the deployment self-contained (no new service to
 * run or migrate) and `privateMetadata` is only readable from the backend, so
 * the client cannot forge it.
 */

const KEY = "subscription";

function parseSubscription(raw: unknown): Subscription | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<Subscription>;
  if (typeof value.planId !== "string") return null;
  if (typeof value.currentPeriodEnd !== "string") return null;
  if (typeof value.startedAt !== "string") return null;
  if (value.status !== "active" && value.status !== "cancelled" &&
      value.status !== "expired" && value.status !== "refunded") {
    return null;
  }
  // `in` would accept inherited keys such as "toString"; hasOwnProperty via
  // isPlanId keeps a malformed record from resolving to a non-plan.
  if (!isPlanId(value.planId)) return null;
  return {
    planId: value.planId,
    status: value.status,
    interval: value.interval === "year" ? "year" : "month",
    currentPeriodEnd: value.currentPeriodEnd,
    provider: value.provider ?? "mock",
    reference: typeof value.reference === "string" ? value.reference : undefined,
    idempotencyKey:
      typeof value.idempotencyKey === "string" ? value.idempotencyKey : undefined,
    startedAt: value.startedAt,
  };
}

/**
 * A subscription is live while its paid period has not run out. `cancelled`
 * still counts: cancelling stops future renewals, it does not refund the time
 * the buyer already paid for. `refunded` and `expired` do not.
 */
function isLive(sub: Subscription | null, now = Date.now()): boolean {
  if (!sub) return false;
  if (sub.status !== "active" && sub.status !== "cancelled") return false;
  return Date.parse(sub.currentPeriodEnd) > now;
}

/**
 * Reads the subscription record for any user without the view wrapper.
 *
 * Fails closed: if Clerk is unreachable we return "no subscription" rather than
 * throwing, because this runs inside the chat route and an exception there
 * would break chat for every signed-in visitor. The trade-off is deliberate —
 * during a Clerk outage a paying subscriber is refused rather than served free.
 */
async function readSubscriptionFor(
  userId: string
): Promise<Subscription | null> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const metadata = (user.privateMetadata ?? {}) as Record<string, unknown>;
    return parseSubscription(metadata[KEY]);
  } catch {
    return null;
  }
}

/** Reads the caller's entitlement. Safe to call with no session (returns signed out). */
export async function getSubscriptionView(
  userId: string | null
): Promise<SubscriptionStatusView> {
  if (!userId) {
    return { isSignedIn: false, isSubscribed: false, subscription: null };
  }
  const subscription = await readSubscriptionFor(userId);
  return {
    isSignedIn: true,
    isSubscribed: isLive(subscription),
    subscription,
  };
}

/**
 * Applies a confirmed payment. Called only from the webhook/return handlers,
 * never from anything the browser can post to directly.
 */
export async function applyPaymentEvent(event: PaymentEvent): Promise<Subscription> {
  if (!event.userId) {
    throw new Error("applyPaymentEvent requires a userId");
  }

  const now = new Date();
  const plan = PLANS[event.planId];
  const existing = await readSubscriptionFor(event.userId);

  // A single payment arrives twice: once from the provider webhook and once
  // from the buyer's return trip. Applying it twice would silently double the
  // period, so the first one wins.
  if (
    event.status === "paid" &&
    event.idempotencyKey &&
    existing?.idempotencyKey === event.idempotencyKey
  ) {
    return existing;
  }

  let next: Subscription;

  if (event.status === "paid") {
    // Renewing early extends the existing period rather than replacing it, so
    // the buyer does not lose days they already paid for. A lapsed
    // subscription restarts from today.
    const remaining = existing && isLive(existing, now.getTime())
      ? Date.parse(existing.currentPeriodEnd)
      : now.getTime();
    const periodEnd = event.periodEnd
      ? new Date(event.periodEnd)
      : new Date(remaining + plan.periodDays * 86_400_000);
    next = {
      planId: event.planId,
      status: "active",
      interval: plan.interval,
      currentPeriodEnd: periodEnd.toISOString(),
      provider: event.provider,
      reference: event.reference,
      idempotencyKey: event.idempotencyKey,
      startedAt: now.toISOString(),
    };
  } else if (event.status === "refunded") {
    next = {
      planId: event.planId,
      status: "refunded",
      interval: plan.interval,
      currentPeriodEnd: now.toISOString(),
      provider: event.provider,
      reference: event.reference,
      startedAt: now.toISOString(),
    };
  } else {
    // `cancelled` keeps access until the period already paid for runs out.
    next = {
      planId: existing?.planId ?? event.planId,
      status: "cancelled",
      interval: existing?.interval ?? plan.interval,
      currentPeriodEnd:
        existing?.currentPeriodEnd ??
        new Date(now.getTime() + plan.periodDays * 86_400_000).toISOString(),
      provider: event.provider,
      reference: event.reference,
      startedAt: existing?.startedAt ?? now.toISOString(),
    };
  }

  const client = await clerkClient();
  await client.users.updateUserMetadata(event.userId, {
    privateMetadata: { [KEY]: next },
  });

  return next;
}
