import "server-only";

import { detectKind, type ExtractedKind } from "./format";

/**
 * Turns an uploaded file into plain text the model can read.
 *
 * Only the text ever leaves this module: the original bytes are not kept. PDFs
 * are parsed with `pdf-parse` (pdfjs-dist under the hood), which handles
 * embedded fonts and standard encodings. Anything it cannot read is reported as
 * an error the student can act on rather than silently indexed as blank.
 *
 * The client-safe upload constants live in `./format` so client components can
 * use them without pulling in this server-only module.
 */

export type { ExtractedKind };
export { ACCEPTED_EXTENSIONS, ACCEPTED_MIME_TYPES, detectKind } from "./format";

export interface ExtractResult {
  kind: ExtractedKind;
  text: string;
  pages: number | null;
}

/** PDF magic number, so a mislabelled upload is caught rather than mangled. */
const looksLikePdf = (bytes: Uint8Array): boolean =>
  bytes.length > 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;

/**
 * Normalises extracted text.
 *
 * pdfjs emits one item per text run, which produces ragged whitespace and lines
 * split mid-sentence. Collapsing that keeps the token count (and therefore the
 * cost and latency of every later request) down.
 */
export function normaliseText(input: string): string {
  return input
    .replace(/\r\n?/g, "\n")
    // De-hyphenate words broken across a line by the layout engine.
    .replace(/([a-z])-\n([a-z])/gi, "$1$2")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    // Three or more blank lines collapse to a paragraph break.
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractPdf(bytes: Uint8Array): Promise<ExtractResult> {
  // Required lazily so the pdfjs bundle is not pulled into non-PDF code paths.
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: bytes });
  try {
    const result = await parser.getText();
    return {
      kind: "pdf",
      text: normaliseText(result.text),
      pages: result.total ?? null,
    };
  } finally {
    // Releases the worker; leaking these across uploads is a slow memory leak.
    await parser.destroy().catch(() => undefined);
  }
}

function extractPlainText(bytes: Uint8Array): ExtractResult {
  const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  return { kind: "text", text: normaliseText(decoded), pages: null };
}

/**
 * Extracts text from a supported upload.
 *
 * Returns `null` for a type we do not handle, so the caller can answer 415 with
 * the list of accepted types rather than attempting a parse that will fail in a
 * less obvious way.
 */
export async function extractText(
  bytes: Uint8Array,
  filename: string,
  contentType?: string
): Promise<ExtractResult | null> {
  const kind = detectKind(contentType, filename);
  if (!kind) return null;

  // A file claiming to be a PDF is parsed as one regardless of its name, and
  // text that starts with the PDF header is treated as a PDF too.
  const effective: ExtractedKind =
    kind === "pdf" || looksLikePdf(bytes) ? "pdf" : "text";

  return effective === "pdf" ? extractPdf(bytes) : extractPlainText(bytes);
}