import "server-only";

import type { Firestore } from "firebase-admin/firestore";

/**
 * Firebase Admin access for the server.
 *
 * SaiGPT authenticates with Clerk and keeps billing entitlements in Clerk
 * `privateMetadata`, so Firebase is **storage only** here. This module is the
 * single place the Firestore handle is created; it is deliberately not exported
 * to the browser and holds no entitlement logic.
 *
 * The Admin SDK is used rather than the client SDK because every write is made
 * on behalf of a Clerk-authenticated user, and Firestore security rules key off
 * Firebase Auth identities. The server is the trust boundary: it has already
 * verified the Clerk session before it reaches any of these calls, so the
 * Admin SDK's rule-bypassing access is appropriate and the rules can stay fully
 * locked to clients.
 *
 * Configuration is optional. With no service account this returns `null` and the
 * stores fall back to their in-process implementation, which keeps local
 * development and the test suite working without credentials. The fallback is
 * announced once at startup so a production deployment cannot silently lose a
 * student's library to a missing environment variable.
 *
 * Required environment variables (a standard service-account key):
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY   (with literal \n escapes, as in a .env file)
 */

interface ServiceAccount {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

const readServiceAccount = (): ServiceAccount | null => {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !rawKey) return null;

  // .env files cannot contain real newlines, so keys are stored with \n escapes.
  // Replace them and tolerate a value that already has real newlines.
  const privateKey = rawKey.includes("\\n")
    ? rawKey.replace(/\\n/g, "\n").trim()
    : rawKey.trim();

  if (!privateKey.includes("BEGIN PRIVATE KEY")) return null;

  return { projectId, clientEmail, privateKey };
};

/** Whether a service account is present, without importing the SDK. */
export function isFirestoreConfigured(): boolean {
  return readServiceAccount() !== null;
}

let cached: Promise<Firestore | null> | null = null;

async function initialise(): Promise<Firestore | null> {
  const account = readServiceAccount();
  if (!account) {
    // Warning rather than an error: the in-process fallback is a valid mode for
    // development, and the stores say so again on first use.
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[firebase] No service account configured. Course notes and daily counters " +
          "will be held in memory and lost on restart. Set FIREBASE_PROJECT_ID, " +
          "FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY to persist them."
      );
    }
    return null;
  }

  // Imported lazily so the admin SDK is never pulled into a bundle or a test
  // process that is not using Firestore.
  const { cert, getApps, initializeApp } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");

  const app = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert({
          projectId: account.projectId,
          clientEmail: account.clientEmail,
          privateKey: account.privateKey,
        }),
        projectId: account.projectId,
      });

  const db = getFirestore(app);
  // A partially-populated note should not throw on a missing optional field.
  db.settings({ ignoreUndefinedProperties: true });
  return db;
}

/**
 * The Firestore handle, or `null` when Firebase is not configured.
 *
 * Memoised, including the `null`, so a missing configuration is not re-checked
 * on every request.
 */
export function getDb(): Promise<Firestore | null> {
  if (!cached) cached = initialise();
  return cached;
}

/** Test-only: clears the memoised handle so configuration can change. */
export function __resetFirebaseForTests(): void {
  cached = null;
}
