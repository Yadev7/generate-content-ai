import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { availableProviders, getAdapter } from "@/lib/payments";
import { DEFAULT_PLAN_ID, isPlanId, PLANS } from "@/lib/subscription/plans";
import type { ProviderId } from "@/lib/subscription/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Starts a checkout. Requires a signed-in user because the entitlement is
 * attached to a Clerk account, and the amount always comes from the plan
 * catalogue rather than the request body.
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in before subscribing." },
      { status: 401 }
    );
  }

  let body: { planId?: unknown; provider?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const planId = isPlanId(body.planId) ? body.planId : DEFAULT_PLAN_ID;
  const providerId =
    typeof body.provider === "string" ? (body.provider as ProviderId) : null;

  if (!providerId) {
    return NextResponse.json({ error: "Unknown payment method" }, { status: 400 });
  }
  if (!availableProviders().some((p) => p.id === providerId)) {
    return NextResponse.json(
      { error: "That payment method is not available." },
      { status: 400 }
    );
  }

  const adapter = getAdapter(providerId);
  const plan = PLANS[planId];

  // Absolute, because the provider redirects the browser here.
  const origin = new URL(request.url).origin;

  try {
    const session = await adapter.createCheckout({
      planId: plan.id,
      userId,
      email: "",
      reference: `chk_${userId}_${Date.now().toString(36)}`,
      returnUrl: `${origin}/subscribe/return?provider=${providerId}`,
      cancelUrl: `${origin}/?checkout=cancelled`,
    });

    return NextResponse.json({ redirectUrl: session.redirectUrl });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "checkout failed";
    return NextResponse.json(
      { error: `Could not start checkout: ${detail}` },
      { status: 502 }
    );
  }
}
