/**
 * Freemium limits for SaiGPT (education pivot). These are data-driven so the UI
 * can render a clear "Free vs Sai Prime" comparison without hard-coding strings
 * in multiple places.
 *
 * The numbers in `DAILY_MESSAGE_LIMITS` are the enforcement source of truth: the
 * marketing strings below are derived from them and `src/lib/quota.ts` counts
 * against them, so the copy can never promise a cap the server does not apply.
 */
export interface FreemiumLimit {
  /** Short label shown in tables, e.g. "Messages per day (Study Desk)". */
  label: string;
  /** Explanation for parents/students. */
  description: string;
  /** The limit value shown to the user (e.g. "15/day", "Unlimited"). */
  free: string;
  /** Prime value. */
  prime: string;
}

/** Which metered tier a caller is in. Subscribers are never metered. */
export type MeterTier = "public" | "account";

/**
 * Messages a non-subscriber may send per UTC day. `account` is what a signed-in
 * free user gets across all of their unlocked tutors; `public` is the no-sign-in
 * Study Desk allowance.
 */
export const DAILY_MESSAGE_LIMITS: Record<MeterTier, number> = {
  public: 15,
  account: 15,
};

export const UNLIMITED_DISPLAY = "Unlimited";

/** "15 messages/day" / "Unlimited", for the UI. */
export function limitDisplay(tier: MeterTier | "prime"): string {
  if (tier === "prime") return UNLIMITED_DISPLAY;
  return `${DAILY_MESSAGE_LIMITS[tier]} messages/day`;
}

/**
 * Broad feature comparison between the free tier and Sai Prime. Keep values
 * concrete and student-friendly: students need to know what stops working once
 * they hit the cap.
 */
export const FREEMIUM_FEATURES: FreemiumLimit[] = [
  {
    label: "Study Desk (public)",
    description: "Quick revision help with no sign-in required.",
    free: limitDisplay("public"),
    prime: UNLIMITED_DISPLAY,
  },
  {
    label: "STEM Tutor (Math/Physics)",
    description: "Worked steps, units and misconceptions.",
    free: limitDisplay("account"),
    prime: UNLIMITED_DISPLAY,
  },
  {
    label: "Language & Literature Expert",
    description: "Literature, writing feedback and grammar explanations.",
    free: limitDisplay("account"),
    prime: UNLIMITED_DISPLAY,
  },
  {
    label: "Humanities Coach (Philosophy/History)",
    description: "Arguments, counter-arguments and source literacy.",
    free: "Locked",
    prime: UNLIMITED_DISPLAY,
  },
  {
    label: "General Exam Quiz Master",
    description: "Exam-style questions, marking and spaced retrieval.",
    free: "Locked",
    prime: UNLIMITED_DISPLAY,
  },
  {
    label: "Advanced exam prep (Sai Prime)",
    description: "Gap analysis, mark-scheme keywords and next-action plan.",
    free: "Locked",
    prime: "Included",
  },
];

/**
 * Persona access ladder mapped to the new academic roles. This mirrors the
 * ordering in `src/lib/chat.ts` for the new `PersonaId`s.
 */
export const PERSONA_LIMITS = {
  general: { access: "public", free: limitDisplay("public"), prime: UNLIMITED_DISPLAY },
  stem: { access: "account", free: limitDisplay("account"), prime: UNLIMITED_DISPLAY },
  language: { access: "account", free: limitDisplay("account"), prime: UNLIMITED_DISPLAY },
  humanities: { access: "subscription", free: "Locked", prime: UNLIMITED_DISPLAY },
  quiz: { access: "subscription", free: "Locked", prime: UNLIMITED_DISPLAY },
} as const;

export const PRIME_HIGHLIGHTS = [
  "Unlimited access to all 5 tutors (including Humanities and Exam Quiz Master)",
  "Exam-focused: mark-scheme feedback, gap analysis and spaced retrieval",
  "Parent-friendly: builds revision discipline without distractions",
  "Cancel anytime. Student-first pricing.",
];
