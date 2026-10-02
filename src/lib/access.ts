import {
  canUsePersona,
  personas,
  type AccessContext,
  type Persona,
  type PersonaId,
} from "./chat";

/**
 * Feature-level access control for Sai Prime.
 *
 * `canUsePersona` in `src/lib/chat.ts` answers "may this person open this
 * tutor?". That is necessary but not sufficient: a capability can be
 * Prime-only without being a tutor of its own (an exam report, a mark-scheme
 * breakdown), and each caller should not have to re-derive that from a persona.
 * This module is the single gate both cases go through.
 *
 * It is deliberately isomorphic and takes the entitlement as an argument rather
 * than reading it. The server resolves the subscription from Clerk and passes it
 * in; the client passes what `/api/subscription` reported. Nothing here trusts a
 * caller-supplied flag on its own — see `src/lib/subscription/guard.ts` for the
 * enforcing half that re-reads the entitlement itself.
 */

/**
 * Capabilities that require an active Sai Prime subscription.
 *
 * A closed set of string keys, so a typo in a feature name is a compile error
 * rather than a silently unlocked feature.
 */
export const PRIME_FEATURES = [
  /** Philosophy/history essay coaching. */
  "humanitiesCoach",
  /** Cross-subject exam questions with mark-scheme feedback. */
  "examQuizMaster",
  /** Gap analysis and next-action plans across subjects. */
  "advancedExamPrep",
  /** Uploading course PDFs and notes, and grounding answers in them. */
  "courseNotes",
  /** Generating a custom quiz or mock exam from a topic or uploaded notes. */
  "quizGenerator",
  /** Bypasses the daily message cap. */
  "unlimitedMessages",
] as const;

export type PrimeFeature = (typeof PRIME_FEATURES)[number];

const PRIME_FEATURE_SET: ReadonlySet<string> = new Set(PRIME_FEATURES);

export const isPrimeFeature = (value: unknown): value is PrimeFeature =>
  typeof value === "string" && PRIME_FEATURE_SET.has(value);

/**
 * The tutor that has to be unlocked for a feature to work.
 *
 * A feature that is a capability of a tutor maps to that tutor;
 * `unlimitedMessages` is account-wide and maps to `null`, so it checks the
 * subscription alone.
 */
export const FEATURE_PERSONA: Record<PrimeFeature, PersonaId | null> = {
  humanitiesCoach: "humanities",
  examQuizMaster: "quiz",
  advancedExamPrep: "quiz",
  // Account-wide tools rather than a tutor of their own: they build a quiz or
  // index notes for use across every subject, so no single persona gates them.
  courseNotes: null,
  quizGenerator: null,
  unlimitedMessages: null,
};

/**
 * Why access was refused. The client branches on these to offer the right next
 * step: an account for the specialists, a paid plan for the Prime ones.
 */
export type LockReason = "signin_required" | "subscription_required";

export interface GateDecision {
  allowed: boolean;
  /** Populated only when `allowed` is false. */
  reason?: LockReason;
  /** Which feature was checked, when the check was feature-level. */
  feature?: PrimeFeature;
  /** The tutor the caller must unlock, when one applies. */
  personaId?: PersonaId;
  /** True when the missing thing is a paid plan rather than an account. */
  upgradeable: boolean;
}

const ALLOW: GateDecision = { allowed: true, upgradeable: false };

const deny = (
  reason: LockReason,
  extra: { feature?: PrimeFeature; personaId?: PersonaId | null }
): GateDecision => ({
  allowed: false,
  reason,
  feature: extra.feature,
  personaId: extra.personaId ?? undefined,
  // A visitor with no account needs one before they can pay, so the dialog
  // should offer sign-up rather than checkout.
  upgradeable: reason === "subscription_required",
});

const personaForId = (id: PersonaId): Persona | undefined =>
  personas.find((p) => p.id === id);

/**
 * The gate. Returns a decision instead of throwing so callers can build their
 * own response, and so the client can render exactly the lock state it will be
 * refused by.
 */
export function gateFeature(
  feature: PrimeFeature,
  context: AccessContext
): GateDecision {
  const { isSignedIn, isSubscribed } = context;
  const personaId = FEATURE_PERSONA[feature];

  // No account means no subscription, whatever the client believes.
  if (!isSignedIn) {
    return deny("signin_required", { feature, personaId });
  }

  // A lapsed plan is the same as no plan. This is the "active subscription"
  // check: `getSubscriptionView` only reports `isSubscribed` while the paid
  // period has not run out, so `cancelled`-but-unexpired still passes and
  // `expired`/`refunded` does not.
  if (!isSubscribed) {
    return deny("subscription_required", { feature, personaId });
  }

  if (personaId === null) return ALLOW;

  // Defence in depth: if a feature's tutor were ever re-tiered, being a
  // subscriber could no longer be enough to reach the feature.
  const persona = personaForId(personaId);
  if (!persona) return deny("subscription_required", { feature, personaId });
  return canUsePersona(persona, context)
    ? ALLOW
    : deny("signin_required", { feature, personaId });
}

/** Convenience boolean for render paths that do not need the reason. */
export const hasFeature = (
  feature: PrimeFeature,
  context: AccessContext
): boolean => gateFeature(feature, context).allowed;

/** Every feature resolved for one viewer, including the reason for each lock. */
export type FeatureAccess = Record<PrimeFeature, GateDecision>;

export function resolveFeatureAccess(context: AccessContext): FeatureAccess {
  return PRIME_FEATURES.reduce((acc, feature) => {
    acc[feature] = gateFeature(feature, context);
    return acc;
  }, {} as FeatureAccess);
}

/** Just the keys, so a large decision object does not go over the wire. */
export type FeatureUnlockMap = Record<PrimeFeature, boolean>;

export const featureUnlockMap = (context: AccessContext): FeatureUnlockMap =>
  PRIME_FEATURES.reduce((acc, feature) => {
    acc[feature] = gateFeature(feature, context).allowed;
    return acc;
  }, {} as FeatureUnlockMap);

/** Gate for a tutor, in the same decision shape as a feature. */
export function gatePersona(
  persona: Persona,
  context: AccessContext
): GateDecision {
  if (canUsePersona(persona, context)) return ALLOW;
  const reason: LockReason =
    persona.access === "subscription" ? "subscription_required" : "signin_required";
  return deny(reason, { personaId: persona.id });
}
