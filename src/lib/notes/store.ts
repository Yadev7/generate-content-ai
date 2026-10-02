import "server-only";

import type { Firestore } from "firebase-admin/firestore";

import { getDb } from "@/lib/firebase/admin";

/**
 * Storage for uploaded course material (PDFs and notes).
 *
 * Two backends behind one API:
 *
 *  - **Firestore** when a service account is configured. Notes are stored at
 *    `users/{uid}/notes/{noteId}` and survive restarts and multiple instances.
 *  - **In-process** otherwise, for local development and the test suite.
 *
 * The fallback is not silent: `src/lib/firebase/admin.ts` warns in production. A
 * configured backend is never silently downgraded — if Firestore is present and
 * a write fails, the error propagates rather than quietly dropping the note into
 * memory, because a student who uploaded a document must be told it did not save.
 *
 * Only extracted text is kept, never the original file bytes: the model only
 * ever needs the text, and a student's PDF sitting in memory or a log is one
 * more place their material could leak.
 */

export interface StoredNote {
  id: string;
  userId: string;
  /** Original filename, trimmed and stripped of any path components. */
  name: string;
  /** Detected type, so the UI can show a PDF or text badge. */
  kind: "pdf" | "text";
  /** Extracted plain text. Never sent to the browser in full. */
  text: string;
  sizeBytes: number;
  /** Character count of the extracted text, which is what context limits apply to. */
  characters: number;
  /** Pages, for PDFs only; `null` for plain text. */
  pages: number | null;
  uploadedAt: string;
  /**
   * Monotonic insertion counter. `uploadedAt` has millisecond resolution, so two
   * files uploaded in the same tick would otherwise sort unpredictably and the
   * library could show them in the wrong order. In Firestore this is allocated
   * from a per-user counter document inside a transaction.
   */
  seq: number;
}

/** Student-facing limits. Small on purpose: this is revision material, not an archive. */
export const MAX_NOTES_PER_USER = 12;
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
/** Characters of extracted text retained per note. */
export const MAX_CHARS_PER_NOTE = 120_000;
/**
 * Total characters per user across all notes. Context is finite, and this stops
 * one account from filling the server's heap.
 */
export const MAX_CHARS_PER_USER = 300_000;

export class NoteLimitError extends Error {
  constructor(
    message: string,
    readonly code:
      | "too_many_notes"
      | "file_too_large"
      | "storage_full"
      | "unsupported_type"
      | "empty_document"
  ) {
    super(message);
    this.name = "NoteLimitError";
  }
}

/**
 * Keeps a filename safe to render and free of path traversal. The browser
 * usually sends only a basename, but the field is attacker-controlled.
 */
export function sanitiseFilename(input: string): string {
  const base = input.split(/[\\/]/).pop() ?? "";
  const cleaned = base
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[<>:"|?*]/g, "")
    .replace(/^\.+/, "")
    .trim();
  return (cleaned || "document").slice(0, 120);
}

export interface AddNoteInput {
  userId: string;
  name: string;
  kind: StoredNote["kind"];
  text: string;
  sizeBytes: number;
  pages: number | null;
}

/** Monotonic-ish id. Random rather than sequential so ids do not leak upload counts. */
const newId = (): string =>
  `note_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

/**
 * Validates an upload and returns the record to store, or throws.
 *
 * Shared by both backends so the limits cannot drift between them, and so a
 * storage outage cannot be the reason a limit was not enforced.
 */
function prepareNote(
  input: AddNoteInput,
  context: { existingCount: number; existingCharacters: number; seq: number }
): StoredNote {
  const { userId } = input;

  if (context.existingCount >= MAX_NOTES_PER_USER) {
    throw new NoteLimitError(
      `You can keep up to ${MAX_NOTES_PER_USER} documents. Delete one to add another.`,
      "too_many_notes"
    );
  }

  if (input.sizeBytes > MAX_UPLOAD_BYTES) {
    throw new NoteLimitError(
      `That file is ${(input.sizeBytes / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`,
      "file_too_large"
    );
  }

  const text = input.text.trim();
  if (!text) {
    throw new NoteLimitError(
      "No text could be read from that file. If it is a scanned PDF it needs OCR, which is not supported yet.",
      "empty_document"
    );
  }

  const capped = text.slice(0, MAX_CHARS_PER_NOTE);
  if (context.existingCharacters + capped.length > MAX_CHARS_PER_USER) {
    throw new NoteLimitError(
      "Your library is full. Delete a document to make room.",
      "storage_full"
    );
  }

  return {
    id: newId(),
    userId,
    name: sanitiseFilename(input.name),
    kind: input.kind,
    text: capped,
    sizeBytes: input.sizeBytes,
    characters: capped.length,
    pages: input.pages,
    uploadedAt: new Date().toISOString(),
    seq: context.seq,
  };
}

// ---------------------------------------------------------------------------
// Firestore backend
// ---------------------------------------------------------------------------

const notesCollection = (db: Firestore, userId: string) =>
  db.collection("users").doc(userId).collection("notes");

/** Allocates the next insertion sequence for a user, inside a transaction. */
async function nextSeq(db: Firestore, userId: string): Promise<number> {
  const counterRef = db
    .collection("users")
    .doc(userId)
    .collection("meta")
    .doc("counters");

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists ? Number(snap.get("noteSeq") ?? 0) : 0;
    const next = Number.isFinite(current) ? current + 1 : 1;
    tx.set(counterRef, { noteSeq: next }, { merge: true });
    return next;
  });
}

async function totalCharactersIn(db: Firestore, userId: string): Promise<number> {
  const snap = await notesCollection(db, userId).select("characters").get();
  return snap.docs.reduce((sum, doc) => sum + Number(doc.get("characters") ?? 0), 0);
}

const fromDoc = (userId: string, id: string, data: Record<string, unknown>): StoredNote => ({
  id,
  userId,
  name: String(data.name ?? "document"),
  kind: data.kind === "pdf" ? "pdf" : "text",
  text: String(data.text ?? ""),
  sizeBytes: Number(data.sizeBytes ?? 0),
  characters: Number(data.characters ?? 0),
  pages: typeof data.pages === "number" ? data.pages : null,
  uploadedAt: String(data.uploadedAt ?? new Date(0).toISOString()),
  seq: Number(data.seq ?? 0),
});

// ---------------------------------------------------------------------------
// In-process backend (fallback when Firebase is not configured)
// ---------------------------------------------------------------------------

interface MemoryBucket {
  notes: Map<string, StoredNote>;
}

const memoryBuckets = new Map<string, MemoryBucket>();
let memorySequence = 0;

const memoryBucketFor = (userId: string): MemoryBucket => {
  let bucket = memoryBuckets.get(userId);
  if (!bucket) {
    bucket = { notes: new Map() };
    memoryBuckets.set(userId, bucket);
  }
  return bucket;
};

// ---------------------------------------------------------------------------
// Public API (async: one backend is remote)
// ---------------------------------------------------------------------------

/**
 * Stores a note, enforcing the per-user limits.
 *
 * Throws `NoteLimitError` rather than returning a result, so a caller cannot
 * forget to handle the refusal. Text is truncated to the per-note cap: a 300-page
 * PDF otherwise pushes everything else out of the model's context window and
 * costs the student their whole session.
 */
export async function addNote(input: AddNoteInput): Promise<StoredNote> {
  const db = await getDb();

  if (!db) {
    const bucket = memoryBucketFor(input.userId);
    let existingCharacters = 0;
    for (const note of Array.from(bucket.notes.values())) existingCharacters += note.characters;
    const note = prepareNote(input, {
      existingCount: bucket.notes.size,
      existingCharacters,
      seq: (memorySequence += 1),
    });
    bucket.notes.set(note.id, note);
    return note;
  }

  const countSnap = await notesCollection(db, input.userId).count().get();
  const existingCount = countSnap.data().count;
  const existingCharacters = await totalCharactersIn(db, input.userId);
  const note = prepareNote(input, {
    existingCount,
    existingCharacters,
    seq: await nextSeq(db, input.userId),
  });

  await notesCollection(db, input.userId).doc(note.id).set({ ...note });
  return note;
}

/** Newest first, tie-broken on insertion order so same-tick uploads stay stable. */
export async function listNotes(userId: string): Promise<StoredNote[]> {
  const db = await getDb();

  if (!db) {
    return Array.from(memoryBucketFor(userId).notes.values()).sort((a, b) => b.seq - a.seq);
  }

  const snap = await notesCollection(db, userId).orderBy("seq", "desc").get();
  return snap.docs.map((doc) =>
    fromDoc(userId, doc.id, doc.data() as Record<string, unknown>)
  );
}

export async function getNote(userId: string, id: string): Promise<StoredNote | null> {
  const db = await getDb();

  if (!db) return memoryBucketFor(userId).notes.get(id) ?? null;

  const snap = await notesCollection(db, userId).doc(id).get();
  if (!snap.exists) return null;
  return fromDoc(userId, id, snap.data() as Record<string, unknown>);
}

export async function deleteNote(userId: string, id: string): Promise<boolean> {
  const db = await getDb();

  if (!db) return memoryBucketFor(userId).notes.delete(id);

  const ref = notesCollection(db, userId).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.delete();
  return true;
}

export async function totalCharacters(userId: string): Promise<number> {
  const db = await getDb();

  if (!db) {
    let sum = 0;
    for (const note of Array.from(memoryBucketFor(userId).notes.values())) sum += note.characters;
    return sum;
  }

  return totalCharactersIn(db, userId);
}

/**
 * The stored text, capped so a single note cannot consume the whole context
 * window on its own. Returns `null` when the note is gone.
 */
export async function textForContext(
  userId: string,
  id: string,
  maxChars: number
): Promise<string | null> {
  const note = await getNote(userId, id);
  if (!note) return null;
  return note.text.slice(0, maxChars);
}

/** Test-only: drops one user's in-memory library, or all of them. */
export function __resetNotesForTests(userId?: string): void {
  if (userId) memoryBuckets.delete(userId);
  else memoryBuckets.clear();
  memorySequence = 0;
}
