/**
 * Client-safe notes constants.
 *
 * Deliberately separate from `extract.ts`: that module imports `server-only`
 * because it parses PDFs, and a client component cannot import it. The upload
 * button needs the accepted extensions for its `accept` attribute, so those
 * live here where both sides can read them.
 */

export type ExtractedKind = "pdf" | "text";

/** Accepted upload types. Kept narrow on purpose: this is revision material. */
export const ACCEPTED_MIME_TYPES: Record<string, ExtractedKind> = {
  "application/pdf": "pdf",
  "text/plain": "text",
  "text/markdown": "text",
  "text/x-markdown": "text",
  // Some browsers and exporters send these for .md and .txt.
  "application/octet-stream": "text",
  "": "text",
};

export const ACCEPTED_EXTENSIONS = [".pdf", ".txt", ".md", ".markdown"];

/**
 * Decides how to parse a file, from its declared type and its extension.
 *
 * The extension is a fallback rather than the primary signal because browsers
 * disagree about the type of a `.md` file, and a wrong guess here means the
 * student's notes are silently unreadable.
 */
export function detectKind(
  contentType: string | undefined,
  filename: string
): ExtractedKind | null {
  const type = (contentType ?? "").split(";")[0].trim().toLowerCase();

  if (type === "application/pdf") return "pdf";
  if (type.startsWith("text/")) return "text";

  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))) return "text";

  return ACCEPTED_MIME_TYPES[type] ?? null;
}