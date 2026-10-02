import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { extractText, ACCEPTED_EXTENSIONS } from "@/lib/notes/extract";
import {
  addNote,
  deleteNote,
  listNotes,
  NoteLimitError,
  MAX_UPLOAD_BYTES,
  type StoredNote,
} from "@/lib/notes/store";
import { requireFeature, refusalResponse } from "@/lib/subscription/guard";

/**
 * Uploaded course material.
 *
 * Prime-only: `requireFeature` reads the entitlement from Clerk rather than
 * trusting the request, so a free or anonymous caller cannot upload by editing
 * a request. Reading a note's text also requires the feature, not just writing
 * it, because the text is the student's own material.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Never send the extracted text to the browser in a list; it can be very large. */
const toSummary = (note: StoredNote) => ({
  id: note.id,
  name: note.name,
  kind: note.kind,
  sizeBytes: note.sizeBytes,
  characters: note.characters,
  pages: note.pages,
  uploadedAt: note.uploadedAt,
});

const LIMIT_STATUS: Record<NoteLimitError["code"], number> = {
  too_many_notes: 409,
  file_too_large: 413,
  storage_full: 409,
  unsupported_type: 415,
  empty_document: 422,
};

function limitResponse(err: NoteLimitError) {
  return NextResponse.json(
    { error: err.message, code: err.code },
    { status: LIMIT_STATUS[err.code] ?? 400 }
  );
}

/** Lists the caller's documents. */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in to manage your course notes.", code: "signin_required" },
      { status: 401 }
    );
  }

  const guard = await requireFeature(userId, "courseNotes");
  if (!guard.ok) return refusalResponse(guard);

  return NextResponse.json({ notes: (await listNotes(userId)).map(toSummary) });
}

/**
 * Accepts one document as multipart form data under the field `file`.
 *
 * FormData is used rather than a JSON body because a PDF has to travel as
 * binary; base64-in-JSON would inflate it by a third and hold two copies in
 * memory at once.
 */
export async function POST(request: Request) {
  const { userId } = await auth();

  const guard = await requireFeature(userId, "courseNotes");
  if (!guard.ok) return refusalResponse(guard);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart form data.", code: "invalid_form" },
      { status: 400 }
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No file was uploaded.", code: "missing_file" },
      { status: 400 }
    );
  }

  // Checked before reading the whole body into memory, so an oversized upload
  // is refused without being buffered.
  if (file.size > MAX_UPLOAD_BYTES) {
    return limitResponse(
      new NoteLimitError(
        `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`,
        "file_too_large"
      )
    );
  }

  if (file.size === 0) {
    return limitResponse(new NoteLimitError("That file is empty.", "empty_document"));
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  let extracted: Awaited<ReturnType<typeof extractText>>;
  try {
    extracted = await extractText(bytes, file.name, file.type);
  } catch (err) {
    const detail = err instanceof Error ? err.message : "could not be parsed";
    return NextResponse.json(
      {
        error: `That PDF could not be read (${detail}). If it is password-protected or a scan, it needs to be unlocked or OCR'd first.`,
        code: "parse_failed",
      },
      { status: 422 }
    );
  }

  if (!extracted) {
    return NextResponse.json(
      {
        error: `Unsupported file type. Upload one of: ${ACCEPTED_EXTENSIONS.join(", ")}.`,
        code: "unsupported_type",
      },
      { status: 415 }
    );
  }

  try {
    const note = await addNote({
      userId: userId as string,
      name: file.name,
      kind: extracted.kind,
      text: extracted.text,
      sizeBytes: file.size,
      pages: extracted.pages,
    });
    return NextResponse.json({ note: toSummary(note) }, { status: 201 });
  } catch (err) {
    if (err instanceof NoteLimitError) return limitResponse(err);
    throw err;
  }
}

/** Removes one document. Scoped to the caller, so ids cannot be guessed across users. */
export async function DELETE(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in to manage your course notes.", code: "signin_required" },
      { status: 401 }
    );
  }

  const guard = await requireFeature(userId, "courseNotes");
  if (!guard.ok) return refusalResponse(guard);

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "An `id` query parameter is required.", code: "missing_id" },
      { status: 400 }
    );
  }

  // deleteNote is keyed on the caller's own bucket, so another user's id is a
  // miss rather than a deletion.
  const removed = await deleteNote(userId, id);
  if (!removed) {
    return NextResponse.json(
      { error: "No such document.", code: "not_found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ deleted: id });
}