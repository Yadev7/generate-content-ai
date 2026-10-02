"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";

import { PRIME_FEATURES, type FeatureAccess } from "@/lib/access";
import { DEFAULT_PLAN_ID } from "@/lib/subscription/plans";
import type { Plan, PlanId } from "@/lib/subscription/plans";
import type { ProviderId, Subscription } from "@/lib/subscription/types";

export interface ProviderOption {
  id: ProviderId;
  label: string;
}

interface SubscriptionResponse {
  isSignedIn: boolean;
  isSubscribed: boolean;
  subscription: Subscription | null;
  plans: Plan[];
}

export interface SubscriptionState {
  isLoaded: boolean;
  isSignedIn: boolean;
  isSubscribed: boolean;
  subscription: Subscription | null;
  plans: Plan[];
  providers: ProviderOption[];
  /**
   * Prime feature decisions resolved by the server. Sent rather than recomputed
   * so the UI shows the same locks the API will refuse with. Always populated:
   * it falls back to locking everything until the real decisions arrive.
   */
  features: FeatureAccess;
  planId: PlanId;
  provider: ProviderId | null;
  setPlanId: (planId: PlanId) => void;
  setProvider: (provider: ProviderId) => void;
  refresh: () => Promise<void>;
}

/**
 * Locks every Prime feature until the server says otherwise, so a control can
 * never render unlocked before its entitlement is known.
 */
const LOCKED_FEATURES: FeatureAccess = PRIME_FEATURES.reduce((acc, feature) => {
  acc[feature] = { allowed: false, reason: "subscription_required", feature, upgradeable: true };
  return acc;
}, {} as FeatureAccess);

/**
 * Entitlement state for the current viewer.
 *
 * Guests and signed-out visitors are resolved from the same endpoint, so the
 * client can render locks and upgrade prompts. This is presentation only — the
 * server re-checks the subscription on every chat request, so a tampered or
 * stale client cannot unlock the premium assistant.
 */
export function useSubscription(): SubscriptionState {
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const [state, setState] = useState<
    Omit<SubscriptionState, "setPlanId" | "setProvider" | "refresh">
  >({
    isLoaded: false,
    isSignedIn: false,
    isSubscribed: false,
    subscription: null,
    plans: [],
    providers: [],
    features: LOCKED_FEATURES,
    planId: DEFAULT_PLAN_ID,
    provider: null,
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/subscription", { cache: "no-store" });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = (await res.json()) as SubscriptionResponse & {
        providers?: ProviderOption[];
        features?: FeatureAccess;
      };
      setState((prev) => ({
        ...prev,
        isLoaded: true,
        isSignedIn: data.isSignedIn,
        isSubscribed: data.isSubscribed,
        subscription: data.subscription,
        plans: data.plans ?? [],
        providers: data.providers ?? [],
        // A payload missing `features` means the server is older than this
        // client; keep the locked defaults rather than assuming access.
        features: data.features ?? LOCKED_FEATURES,
        provider: prev.provider ?? data.providers?.[0]?.id ?? null,
      }));
    } catch {
      // Treat an unreachable endpoint as "no access" rather than "subscribed".
      setState((prev) => ({ ...prev, isLoaded: true, features: LOCKED_FEATURES }));
    }
  }, []);

  useEffect(() => {
    if (!authLoaded) return;
    void load();
  }, [authLoaded, isSignedIn, load]);

  // Coming back from checkout should reflect the new entitlement without a
  // manual reload, so re-check when the user lands with a checkout flag.
  useEffect(() => {
    if (!authLoaded) return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has("subscribed")) return;
    void load();
  }, [authLoaded, load]);

  return {
    ...state,
    setPlanId: (planId) => setState((prev) => ({ ...prev, planId })),
    setProvider: (provider) => setState((prev) => ({ ...prev, provider })),
    refresh: load,
  };
}
