import { NextResponse } from "next/server";

import { availableProviders, getAdapter } from "@/lib/payments";
import { applyPaymentEvent } from "@/lib/subscription/server";
import type { ProviderId } from "@/lib/subscription/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Provider callback. This is the authoritative path for granting access, since
 * it fires even when the buyer never returns to the site.
 *
 * Authenticity is the adapter's job: PayPal signatures are verified with
 * PayPal's endpoint, Payzone and the mock provider verify an HMAC carried in
 * the reference. Nothing here trusts the body on its own.
 */
export async function POST(
  request: Request,
  { params }: { params: { provider: string } }
) {
  const providerId = params.provider as ProviderId;

  if (!availableProviders().some((p) => p.id === providerId)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  }

  const body = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  try {
    const adapter = getAdapter(providerId);
    const event = await adapter.parseWebhook({ headers, body });

    if (!event) {
      // Verified but not actionable (e.g. an event type we do not care about).
      return NextResponse.json({ received: true, applied: false });
    }

    if (!event.userId) {
      return NextResponse.json({ error: "Event has no user" }, { status: 400 });
    }

    await applyPaymentEvent(event);
    return NextResponse.json({ received: true, applied: true });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "webhook failed";
    return NextResponse.json({ error: detail }, { status: 400 });
  }
}
