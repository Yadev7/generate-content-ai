/**
 * Prompt construction for grounded chat over an uploaded course document.
 *
 * This is the "query your own PDF" half of the Prime course-notes feature. The
 * quiz generator (`src/lib/quiz/prompt.ts`) also reads a note, but it produces a
 * structured paper; here the existing tutor keeps its voice and simply gains a
 * source to answer from, so a student can ask "summarise chapter 3" or "what
 * does the book say about osmosis?" without switching tutor.
 *
 * The extraction and storage live in `store.ts`; this module only decides how
 * the text is framed for the model. It is pure so it can be unit-tested without
 * a model or a database.
 */

import type { StoredNote } from "./store";

/**
 * Cap on source text handed to the model. Matches the quiz generator: a whole
 * book would crowd out the conversation and the student's own question, which is
 * the part that actually needs answering.
 */
export const MAX_GROUNDING_CHARS = 12_000;

export interface GroundedSource {
  name: string;
  kind: StoredNote["kind"];
  text: string;
}

/**
 * Wraps the tutor's own system prompt with the attached document.
 *
 * The rules are deliberate: grounding the model in one student's file is worth
 * little if it silently mixes in plausible-sounding invented detail, and a
 * student revising for an exam cannot tell the two apart. Naming the file and
 * telling the model to admit when the source does not cover an answer keeps the
 * two separable.
 */
export function groundedSystemPrompt(
  basePrompt: string,
  source: GroundedSource
): string {
  const kind = source.kind === "pdf" ? "PDF" : "text file";
  const text = source.text.slice(0, MAX_GROUNDING_CHARS);

  return `${basePrompt}

The student has attached one of their own course documents. Answer as their tutor, using this document as your primary source.

--- BEGIN SOURCE (${kind}): ${source.name} ---
${text}
--- END SOURCE ---

HOW TO USE THE SOURCE
- Ground factual answers and worked examples in the document above, and refer to it by name where it helps.
- If the document does not contain the answer, say so plainly first. You may then answer from general knowledge, clearly labelled as "not from your document", but never present general knowledge as if it came from the file.
- Never invent quotations, page numbers, equations, dates or facts that are not in the source.
- If the passage you need is truncated or the question is outside the document's scope, say so instead of guessing.`;
}
