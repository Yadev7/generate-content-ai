import { createHash } from "node:crypto";

import type { Firestore } from "firebase-admin/firestore";

import { getDb } from "@/lib/firebase/admin";
import { DAILY_MESSAGE_LIMITS, type MeterTier } from "./freemium";

/**
 * Daily message metering for the free tier.
 *
 * The marketing copy promises a per-day cap, so the cap has to live here rather
 * than in the UI. Counting happens on the server in `/api/chat`, which is the only
 * path to the model.
 *
 * Window: one UTC day, so the cap resets predictably and does not depend on the
 * server's local timezone. `day` is derived from the clock at check time.
 *
 * Storage has two backends:
 *
 *  - **Signed-in accounts** use Firestore at `users/{uid}/usage/{day}` when it is
 *    configured. That makes the allowance shared across instances and durable
 *    across restarts, which the in-process map could not do.
 *  - **Guests** stay in-process. A guest has no id to key a document on without
 *    writing an unbounded key space (one per IP+agent) into the database, which
 *    is a cost and abuse vector. The hash of IP + user agent is enough to stop
 *    casual runaway usage, not enough to be abuse-proof -- a determined
 *    anonymous caller can vary the header. Signing in is what moves someone onto
 *    the durable, account-keyed allowance.
 */

interface Bucket {
  day: string;
  used: number;
}

/** In-process counters: guests always, and accounts when Firestore is unconfigured. */
const buckets = new Map<string, Bucket>();

/** Resets the map so a long-lived process does not accumulate dead keys. */
const SWEEP_INTERVAL_MS = 60 * 60 * 1000;
const sweep = setInterval(() => {
  const today = currentDay();
  for (const [key, bucket] of Array.from(buckets.entries())) {
    if (bucket.day !== today) buckets.delete(key);
  }
}, SWEEP_INTERVAL_MS);
// Never hold the event loop open just to sweep counters.
sweep.unref?.();

function currentDay(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function guestKey(request: Request): string {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const agent = request.headers.get("user-agent") ?? "";
  return `guest:${createHash("sha256").update(`${ip}|${agent}`).digest("hex")}`;
}

export interface QuotaState {
  /** The tier that applies, already resolved against the subscription. */
  tier: MeterTier;
  limit: number;
  used: number;
  remaining: number;
  /** UTC day the counter belongs to. */
  day: string;
}

/** Prime is unmetered, so the caller never consults the counters for it. */
export function isMeteredTier(quota: { tier: string }): boolean {
  return quota.tier !== "prime";
}

const usageDoc = (db: Firestore, userId: string, day: string) =>
  db.collection("users").doc(userId).collection("usage").doc(day);

/**
 * Reads the current allowance without changing it, so `/api/chat` can include
 * `remaining` in successful responses and the client can show "3 left today".
 */
export async function readQuota(
  identity: { userId: string } | { guest: Request }
): Promise<QuotaState> {
  const day = currentDay();

  if ("userId" in identity) {
    const db = await getDb();
    if (db) {
      const snap = await usageDoc(db, identity.userId, day).get();
      const used = snap.exists ? Number(snap.get("used") ?? 0) : 0;
      const limit = DAILY_MESSAGE_LIMITS.account;
      return { tier: "account", limit, used, remaining: Math.max(0, limit - used), day };
    }
  }

  const key = "userId" in identity ? `user:${identity.userId}` : guestKey(identity.guest);
  const tier: MeterTier = "userId" in identity ? "account" : "public";
  const bucket = buckets.get(key);
  const used = bucket && bucket.day === day ? bucket.used : 0;
  const limit = DAILY_MESSAGE_LIMITS[tier];
  return { tier, limit, used, remaining: Math.max(0, limit - used), day };
}

export type Reservation =
  | { ok: true; refund: () => Promise<void>; state: QuotaState }
  | { ok: false; state: QuotaState };

/**
 * Consumes one message if the allowance allows it.
 *
 * The count is taken *before* the model call and refunded if the call fails, so
 * a 502 from a cold or wedged LM Studio does not silently burn a student's daily
 * allowance. Refund is identity-based rather than a flag, so a concurrent refund
 * cannot push the counter below zero.
 *
 * On Firestore the check-and-increment runs in a transaction, so two concurrent
 * requests cannot both take the last message.
 */
export async function reserveMessage(
  identity: { userId: string } | { guest: Request },
  limit: number
): Promise<Reservation> {
  const day = currentDay();

  if ("userId" in identity) {
    const db = await getDb();
    if (db) {
      const ref = usageDoc(db, identity.userId, day);
      const outcome = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const used = snap.exists ? Number(snap.get("used") ?? 0) : 0;
        if (used >= limit) return { ok: false as const, used };
        const next = used + 1;
        tx.set(ref, { day, used: next }, { merge: true });
        return { ok: true as const, used: next };
      });

      const state: QuotaState = {
        tier: "account",
        limit,
        used: outcome.used,
        remaining: Math.max(0, limit - outcome.used),
        day,
      };

      if (!outcome.ok) return { ok: false, state };

      return {
        ok: true,
        state,
        refund: async () => {
          await db.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            const current = snap.exists ? Number(snap.get("used") ?? 0) : 0;
            // Clamp at zero: a refund must never hand back more than was taken.
            tx.set(ref, { day, used: Math.max(0, current - 1) }, { merge: true });
          });
        },
      };
    }
  }

  const key = "userId" in identity ? `user:${identity.userId}` : guestKey(identity.guest);
  const tier: MeterTier = "userId" in identity ? "account" : "public";
  const bucket = buckets.get(key);
  const used = bucket && bucket.day === day ? bucket.used : 0;

  if (used >= limit) {
    return { ok: false, state: { tier, limit, used, remaining: 0, day } };
  }

  buckets.set(key, { day, used: used + 1 });

  return {
    ok: true,
    state: { tier, limit, used: used + 1, remaining: limit - (used + 1), day },
    refund: async () => {
      const current = buckets.get(key);
      if (current && current.day === day && current.used > 0) {
        buckets.set(key, { day, used: current.used - 1 });
      }
    },
  };
}

/** Test-only: drops all in-process counters. */
export function __resetQuotaForTests() {
  buckets.clear();
}
