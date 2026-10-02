import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

import {
  PLANS,
  SUBSCRIPTION_CURRENCY,
  isPlanId,
  planDescription,
} from "../subscription/plans";
import type { PaymentEvent } from "../subscription/types";
import type {
  CheckoutRequest,
  CheckoutSession,
  PaymentAdapter,
  WebhookRequest,
} from "./adapter";

/**
 * Payzone adapter (Moroccan gateway).
 *
 * STATUS: scaffold. It is wired to the same interface as PayPal and stays inert
 * until merchant credentials are provided, but the endpoint path and the
 * request/field names below MUST be confirmed against the Payzone merchant
 * documentation for your account before going live. Payzone is not publicly
 * documented to the same degree as PayPal, so treat these constants as
 * placeholders rather than a verified integration.
 *
 * Payzone's callback is a browser redirect (and an optional server POST), so
 * unlike PayPal there is no provider signature to check. Instead the reference
 * we send through the gateway carries an HMAC over its own contents, and the
 * callback is rejected unless that HMAC still verifies. Tampering with the
 * user id or plan in the return URL therefore cannot grant access.
 */

const MERCHANT_ID = process.env.PAYZONE_MERCHANT_ID ?? "";
const REFERENCE_SECRET = process.env.PAYZONE_REFERENCE_SECRET ?? "";
const BASE_URL =
  process.env.PAYZONE_BASE_URL ?? "https://payment.payzone.ma/api/payment";

export const isPayzoneEnabled = Boolean(MERCHANT_ID && REFERENCE_SECRET);

function sign(payload: string): string {
  return createHmac("sha256", REFERENCE_SECRET).update(payload).digest("base64url");
}

/** Reference we echo through the gateway so the callback can be matched back. */
function buildReference(userId: string, planId: string): string {
  // userId/planId are URL-safe; the nonce prevents replay of a whole reference.
  const payload = `u${userId}.${planId}.${Date.now().toString(36)}`;
  return `${payload}.${sign(payload)}`;
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function parseReference(reference: string | undefined): {
  userId: string;
  planId: PaymentEvent["planId"];
} | null {
  if (!reference) return null;

  const lastDot = reference.lastIndexOf(".");
  if (lastDot <= 0) return null;

  const payload = reference.slice(0, lastDot);
  const signature = reference.slice(lastDot + 1);
  if (!safeEqual(sign(payload), signature)) return null;

  const [user, plan] = payload.split(".");
  if (!user?.startsWith("u") || !isPlanId(plan)) return null;
  return { userId: user.slice(1), planId: plan };
}

export const payzoneAdapter: PaymentAdapter = {
  id: "payzone",
  label: "Payzone",

  isConfigured() {
    return isPayzoneEnabled;
  },

  async createCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
    const plan = PLANS[request.planId];
    const reference = buildReference(request.userId, request.planId);

    // TODO(verify): confirm these field names in the Payzone dashboard.
    const params = new URLSearchParams({
      merchant_id: MERCHANT_ID,
      amount: plan.amount,
      currency: SUBSCRIPTION_CURRENCY,
      order_id: reference,
      description: planDescription(plan),
      return_url: request.returnUrl,
      cancel_url: request.cancelUrl,
    });

    return { redirectUrl: `${BASE_URL}?${params.toString()}` };
  },

  async completeReturn(query: Record<string, string>): Promise<PaymentEvent | null> {
    if (query.status && !/paid|success|completed/i.test(query.status)) return null;

    const parsed = parseReference(query.order_id);
    if (!parsed) return null;

    const plan = PLANS[parsed.planId];
    return {
      provider: "payzone",
      userId: parsed.userId,
      planId: parsed.planId,
      status: "paid",
      reference: query.order_id,
      idempotencyKey: query.order_id,
      periodEnd: new Date(Date.now() + plan.periodDays * 86_400_000).toISOString(),
    };
  },

  async parseWebhook(request: WebhookRequest): Promise<PaymentEvent | null> {
    const form = new URLSearchParams(request.body);
    const parsed = parseReference(form.get("order_id") ?? undefined);
    if (!parsed) return null;

    const status = (form.get("status") ?? "").toLowerCase();
    const reference = form.get("order_id") ?? undefined;

    if (/refund|chargeback/.test(status)) {
      return {
        provider: "payzone",
        userId: parsed.userId,
        planId: parsed.planId,
        status: "refunded",
        reference,
      };
    }
    if (!/paid|success|completed/.test(status)) return null;

    const plan = PLANS[parsed.planId];
    return {
      provider: "payzone",
      userId: parsed.userId,
      planId: parsed.planId,
      status: "paid",
      reference,
      idempotencyKey: reference,
      periodEnd: new Date(Date.now() + plan.periodDays * 86_400_000).toISOString(),
    };
  },
};
