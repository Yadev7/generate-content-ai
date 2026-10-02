import "server-only";

import { NextResponse } from "next/server";

import {
  gateFeature,
  isPrimeFeature,
  type LockReason,
  type PrimeFeature,
} from "@/lib/access";
import { getSubscriptionView } from "@/lib/subscription/server";

/**
 * The enforcing half of feature gating.
 *
 * `src/lib/access.ts` decides; this module is what a route handler calls when
 * the decision has consequences. The important part is that it reads the
 * entitlement from Clerk itself via `getSubscriptionView` instead of accepting
 * an `isSubscribed` flag from the request. A client that posts
 * `{ isSubscribed: true }` changes nothing.
 *
 * The entitlement is fetched once and passed to the route, because a route
 * typically needs it for several decisions (quota, persona, feature) and each
 * read is a Clerk round trip.
 */

export interface Entitlement {
  isSignedIn: boolean;
  isSubscribed: boolean;
}

export type FeatureGuard =
  | { ok: true; entitlement: Entitlement }
  | { ok: false; status: 403 | 404; body: Record<string, unknown> };

/** Resolves the caller's entitlement. Fails closed if Clerk is unreachable. */
export async function readEntitlement(userId: string | null): Promise<Entitlement> {
  const view = await getSubscriptionView(userId);
  return { isSignedIn: view.isSignedIn, isSubscribed: view.isSubscribed };
}

/** Human-readable copy, kept next to the status so both can not drift apart. */
const MESSAGES: Record<LockReason, string> = {
  signin_required: "Sign in to use this feature.",
  subscription_required: "This feature requires an active Sai Prime subscription.",
};

/**
 * Checks one feature for the caller's entitlement.
 *
 * `features` is a list so a route can require several at once and get a single
 * response naming the first thing that is missing, which is more useful to a
 * student than three separate 403s.
 *
 * An unrecognised feature name is a 404, not a 403: it is a bug in the calling
 * route, and answering 403 would let a typo masquerade as a paywall. Failing
 * closed matters more here, since treating an unknown key as free would hand
 * out Prime features by accident.
 */
export async function requireFeatures(
  userId: string | null,
  features: readonly PrimeFeature[]
): Promise<FeatureGuard> {
  for (const feature of features) {
    if (!isPrimeFeature(feature)) {
      return {
        ok: false,
        status: 404,
        body: { error: `Unknown feature: ${String(feature)}`, code: "unknown_feature" },
      };
    }
  }

  const entitlement = await readEntitlement(userId);

  for (const feature of features) {
    const decision = gateFeature(feature, entitlement);
    if (decision.allowed) continue;
    const reason: LockReason = decision.reason ?? "subscription_required";
    return {
      ok: false,
      status: 403,
      body: {
        error: MESSAGES[reason],
        code: reason,
        feature,
        // Tells the UI which tutor to point the student at, and lets it decide
        // between offering sign-up and offering checkout.
        personaId: decision.personaId ?? null,
        upgradeable: decision.upgradeable,
      },
    };
  }

  return { ok: true, entitlement };
}

/** Convenience wrapper for a single feature. */
export const requireFeature = (
  userId: string | null,
  feature: PrimeFeature
): Promise<FeatureGuard> => requireFeatures(userId, [feature]);

/**
 * `checkAccess` is the name the product spec uses for the enforcing access check.
 *
 * It is a straight alias of `requireFeature` so the rule has exactly one
 * implementation and the two names cannot drift. As with every guard here, the
 * entitlement is read from Clerk via `getSubscriptionView`; a caller cannot pass
 * an `isSubscribed` flag and be believed.
 */
export const checkAccess = requireFeature;

/** Turns a refusal into the HTTP response, so routes stay a single return. */
export function refusalResponse(guard: Extract<FeatureGuard, { ok: false }>) {
  return NextResponse.json(guard.body, { status: guard.status });
}
