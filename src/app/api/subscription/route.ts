import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { resolveFeatureAccess } from "@/lib/access";
import { availableProviders } from "@/lib/payments";
import { getSubscriptionView } from "@/lib/subscription/server";
import { PLANS } from "@/lib/subscription/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Current entitlement for the signed-in caller, plus the plan catalogue. */
export async function GET() {
  const { userId } = await auth();
  const view = await getSubscriptionView(userId);

  return NextResponse.json({
    ...view,
    // Only providers that are actually configured are offered, so the dialog
    // never shows a method that would fail.
    providers: availableProviders(),
    plans: Object.values(PLANS).map((p) => ({
      id: p.id,
      interval: p.interval,
      amount: p.amount,
      periodDays: p.periodDays,
      blurb: p.blurb,
    })),
    // Resolved server-side so the client renders locks from the same decision
    // the server would refuse with, rather than re-deriving the rules in the
    // browser. Presentation only: every gated route re-checks independently.
    features: resolveFeatureAccess(view),
  });
}
