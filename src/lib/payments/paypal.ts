import "server-only";

import { PLANS, SUBSCRIPTION_CURRENCY, isPlanId, planDescription } from "../subscription/plans";
import type { PaymentEvent } from "../subscription/types";
import type {
  CheckoutRequest,
  CheckoutSession,
  PaymentAdapter,
  WebhookRequest,
} from "./adapter";

/**
 * PayPal Orders v2 integration.
 *
 * Flow: create an order with `intent: CAPTURE`, send the buyer to the
 * `approve` link, then capture. Payment is finalised either by the webhook
 * (preferred, works when the buyer never returns) or by `completeReturn` on
 * the way back (useful locally).
 *
 * Webhook payloads are authenticated with PayPal's own signature-verification
 * endpoint rather than a hand-rolled HMAC, so a forged callback is rejected.
 */

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID ?? "";
const SECRET = process.env.PAYPAL_SECRET ?? "";
const WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID ?? "";

export const isPayPalEnabled = Boolean(CLIENT_ID && SECRET);

function apiBase(): string {
  const mode = process.env.PAYPAL_MODE ?? (isPayPalEnabled ? "sandbox" : "sandbox");
  return mode === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function accessToken(): Promise<string> {
  const res = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${SECRET}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`PayPal auth failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("PayPal did not return an access token");
  return data.access_token;
}

/**
 * Reference encodes who is paying for what, e.g.
 * `u_<userId>.<planId>.<random>` — PayPal echoes it back on the order.
 */
function buildReference(userId: string, planId: string): string {
  return `u_${userId}.${planId}.${Date.now().toString(36)}`;
}

function parseReference(reference: string | undefined): {
  userId: string;
  planId: PaymentEvent["planId"];
} | null {
  if (!reference) return null;
  const [user, plan] = reference.split(".");
  if (!user?.startsWith("u_") || !isPlanId(plan)) return null;
  return { userId: user.slice(2), planId: plan };
}

/**
 * Asks PayPal whether a delivery really came from them. We deliberately do not
 * roll our own HMAC: PayPal signs with its own certs and exposes this endpoint
 * for verification, so a forged callback cannot pass.
 */
async function verifySignature(request: WebhookRequest): Promise<boolean> {
  if (!WEBHOOK_ID) {
    throw new Error("PAYPAL_WEBHOOK_ID is not configured; refusing to trust the payload");
  }
  const token = await accessToken();
  const res = await fetch(`${apiBase()}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth_algo: request.headers["paypal-auth-algo"],
      cert_url: request.headers["paypal-cert-url"],
      transmission_id: request.headers["paypal-transmission-id"],
      transmission_sig: request.headers["paypal-transmission-sig"],
      transmission_time: request.headers["paypal-transmission-time"],
      webhook_id: WEBHOOK_ID,
      webhook_event: JSON.parse(request.body),
    }),
    cache: "no-store",
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { verification_status?: string };
  return data.verification_status === "SUCCESS";
}

/** Reads back the order so we can recover the reference we stored in custom_id. */
async function fetchOrder(orderId: string): Promise<{
  status?: string;
  purchase_units?: { custom_id?: string }[];
} | null> {
  const token = await accessToken();
  const res = await fetch(`${apiBase()}/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as { status?: string; purchase_units?: { custom_id?: string }[] };
}

export const paypalAdapter: PaymentAdapter = {
  id: "paypal",
  label: "PayPal",

  isConfigured() {
    return isPayPalEnabled;
  },

  async createCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
    const plan = PLANS[request.planId];
    const token = await accessToken();

    const res = await fetch(`${apiBase()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        // Stops PayPal reusing a cached order and double-charging.
        "PayPal-Request-Id": request.reference,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: request.reference,
            custom_id: buildReference(request.userId, request.planId),
            description: planDescription(plan),
            amount: {
              currency_code: SUBSCRIPTION_CURRENCY,
              value: plan.amount,
            },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              user_action: "SUBSCRIBE_NOW",
              return_url: request.returnUrl,
              cancel_url: request.cancelUrl,
            },
          },
        },
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`PayPal order failed (${res.status}): ${await res.text()}`);
    }

    const order = (await res.json()) as {
      links?: { rel: string; href: string }[];
      status?: string;
    };
    const approve = order.links?.find((l) => l.rel === "payer-action" || l.rel === "approve");
    if (!approve) throw new Error("PayPal did not return an approval link");
    return { redirectUrl: approve.href };
  },

  async completeReturn(query: Record<string, string>): Promise<PaymentEvent | null> {
    const orderId = query.token;
    if (!orderId) return null;

    const token = await accessToken();
    const res = await fetch(`${apiBase()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      // Already captured (webhook won the race) is fine; anything else is not.
      const detail = await res.text();
      if (/ORDER_ALREADY_CAPTURED/i.test(detail)) return null;
      throw new Error(`PayPal capture failed (${res.status}): ${detail}`);
    }

    const order = (await res.json()) as {
      status?: string;
      purchase_units?: {
        custom_id?: string;
        payments?: { captures?: { id?: string }[] };
      }[];
      payer?: { email_address?: string };
    };

    const unit = order.purchase_units?.[0];
    const captureId = unit?.payments?.captures?.[0]?.id;
    // The signed reference is round-tripped in `custom_id`.
    const parsed = parseReference(unit?.custom_id);

    // Only a completed capture grants access.
    if (order.status !== "COMPLETED" || !parsed) return null;

    const plan = PLANS[parsed.planId];
    return {
      provider: "paypal",
      userId: parsed.userId,
      planId: parsed.planId,
      status: "paid",
      reference: captureId ?? orderId,
      // Matches the webhook's key for this order so the two deliveries of one
      // payment cannot each extend the subscription.
      idempotencyKey: orderId,
      periodEnd: new Date(Date.now() + plan.periodDays * 86_400_000).toISOString(),
    };
  },

  async parseWebhook(request: WebhookRequest): Promise<PaymentEvent | null> {
    const verified = await verifySignature(request);
    if (!verified) return null;

    const parsed = JSON.parse(request.body) as {
      id?: string;
      event_type?: string;
      resource?: Record<string, unknown>;
    };
    const eventType = parsed.event_type ?? "";
    const resource = parsed.resource ?? {};

    // This flow creates Orders, not Subscriptions, so only capture events can
    // apply. `CHECKOUT.ORDER.APPROVED` is deliberately ignored: the buyer has
    // approved but the money has not moved yet. `PAYMENT.CAPTURE.COMPLETED` is
    // the authoritative signal and also covers buyers who never return.
    if (eventType !== "PAYMENT.CAPTURE.COMPLETED") return null;

    const captureId = typeof resource.id === "string" ? resource.id : undefined;
    const related = resource.supplementary_data as
      | { related_ids?: { order_id?: string } }
      | undefined;
    const orderId = related?.related_ids?.order_id;
    if (!orderId) return null;

    // The capture payload does not carry our custom_id, so read it off the
    // order. This is a server-to-server call using our own credentials, so the
    // user id and plan cannot have been supplied by the caller.
    const order = await fetchOrder(orderId);
    const ref = parseReference(order?.purchase_units?.[0]?.custom_id);
    if (!ref) return null;

    const plan = PLANS[ref.planId];
    return {
      provider: "paypal",
      userId: ref.userId,
      planId: ref.planId,
      status: "paid",
      reference: captureId ?? orderId,
      // One order is one payment. The return trip sends the same key, so a
      // buyer who is redirected back cannot be granted a second period.
      idempotencyKey: orderId,
      periodEnd: new Date(Date.now() + plan.periodDays * 86_400_000).toISOString(),
    };
  },
};
