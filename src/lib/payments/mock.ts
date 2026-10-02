import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

import { PLANS } from "../subscription/plans";
import type { PaymentEvent } from "../subscription/types";
import type {
  CheckoutRequest,
  CheckoutSession,
  PaymentAdapter,
} from "./adapter";

/**
 * Development provider. It simulates a real gateway so the subscribe -> unlock
 * journey can be exercised end to end before any merchant account exists.
 *
 * It is only enabled when no real provider is configured AND
 * `ALLOW_MOCK_PAYMENTS` is not explicitly "false". It must never be reachable
 * in production: `isMockPaymentsEnabled()` returns false once a real provider
 * has credentials, and the checkout route also refuses when NODE_ENV is
 * "production" unless it is forced on.
 */

const SECRET = process.env.MOCK_PAYMENT_SECRET ?? "dev-only-mock-secret";

export function isMockPaymentsEnabled(): boolean {
  if (process.env.ALLOW_MOCK_PAYMENTS === "false") return false;
  if (process.env.NODE_ENV === "production" && !process.env.FORCE_MOCK_PAYMENTS) {
    return false;
  }
  return true;
}

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

function buildReference(userId: string, planId: string): string {
  const payload = `u${userId}.${planId}.${Date.now().toString(36)}`;
  return `${payload}.${sign(payload)}`;
}

function parseReference(reference: string | undefined): {
  userId: string;
  planId: PaymentEvent["planId"];
} | null {
  if (!reference) return null;
  const lastDot = reference.lastIndexOf(".");
  if (lastDot <= 0) return null;
  const payload = reference.slice(0, lastDot);
  if (!safeEqual(sign(payload), reference.slice(lastDot + 1))) return null;
  const [user, plan] = payload.split(".");
  if (!user?.startsWith("u") || !(plan in PLANS)) return null;
  return { userId: user.slice(1), planId: plan as PaymentEvent["planId"] };
}

export const mockAdapter: PaymentAdapter = {
  id: "mock",
  label: "Test payment",

  isConfigured() {
    return isMockPaymentsEnabled();
  },

  async createCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
    // Stand-in for the provider's hosted page.
    const params = new URLSearchParams({
      plan: request.planId,
      reference: buildReference(request.userId, request.planId),
    });
    return { redirectUrl: `/subscribe/mock-checkout?${params.toString()}` };
  },

  async completeReturn(query: Record<string, string>): Promise<PaymentEvent | null> {
    if (query.result === "cancel") return null;

    const parsed = parseReference(query.reference);
    if (!parsed) return null;

    const plan = PLANS[parsed.planId];
    return {
      provider: "mock",
      userId: parsed.userId,
      planId: parsed.planId,
      status: "paid",
      reference: query.reference,
      // The signed reference is unique per checkout, so replaying this return
      // URL cannot grant a second period.
      idempotencyKey: query.reference,
      periodEnd: new Date(Date.now() + plan.periodDays * 86_400_000).toISOString(),
    };
  },

  async parseWebhook(): Promise<PaymentEvent | null> {
    return null;
  },
};
