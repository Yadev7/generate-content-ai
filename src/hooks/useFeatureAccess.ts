"use client";

import { useCallback } from "react";

import type { FeatureAccess, LockReason, PrimeFeature } from "@/lib/access";
import { useSubscription } from "@/hooks/useSubscription";

/**
 * UI-side view of the Prime feature gate.
 *
 * Reads the decisions that `/api/subscription` resolved server-side rather than
 * recomputing them in the browser, so a lock rendered here always matches the
 * refusal the server would send. This is presentation only: every gated route
 * re-reads the entitlement from Clerk itself, so editing this state in devtools
 * unlocks nothing.
 */
export interface FeatureAccessState {
  /** False until the entitlement has loaded; features read as locked. */
  isLoaded: boolean;
  features: FeatureAccess;
  /** Whether the viewer may use a feature. */
  can: (feature: PrimeFeature) => boolean;
  /** Why a feature is locked, or `null` when it is available. */
  lockReason: (feature: PrimeFeature) => LockReason | null;
  /** True when a lock is lifted by buying a plan rather than by signing up. */
  isUpgradeable: (feature: PrimeFeature) => boolean;
}

export function useFeatureAccess(): FeatureAccessState {
  const { isLoaded, features } = useSubscription();

  const can = useCallback(
    (feature: PrimeFeature) => features[feature]?.allowed === true,
    [features]
  );

  const lockReason = useCallback(
    (feature: PrimeFeature): LockReason | null => {
      const decision = features[feature];
      if (!decision || decision.allowed) return null;
      return decision.reason ?? "subscription_required";
    },
    [features]
  );

  const isUpgradeable = useCallback(
    (feature: PrimeFeature) => features[feature]?.upgradeable === true,
    [features]
  );

  return { isLoaded, features, can, lockReason, isUpgradeable };
}
