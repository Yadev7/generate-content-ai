/**
 * Parses the `quiz` code block the model returns.
 *
 * A model will not always honour a format contract, so this never throws and
 * never returns an empty array silently: a paper that failed to parse has to be
 * visible as a failure, otherwise the student marks an empty sheet and thinks
 * they scored zero.
 */

import type { QuizQuestionKind } from "./prompt";

export interface ParsedOption {
  label: string;
  text: string;
}

export interface ParsedQuestion {
  number: number;
  text: string;
  kind: QuizQuestionKind;
  options: ParsedOption[];
  marks: number;
  answer: string;
  marking: string;
}

export interface ParsedQuiz {
  title: string;
  totalMarks: number | null;
  timeMinutes: number | null;
  questions: ParsedQuestion[];
  /** Populated when the block was found but nothing usable could be read. */
  warnings: string[];
}

const FENCE = /```quiz\s*\n([\s\S]*?)```/i;

/** Finds the `quiz` block, falling back to a lone block if the tag was dropped. */
function extractBlock(raw: string): string | null {
  const tagged = raw.match(FENCE);
  if (tagged) return tagged[1];

  const anyFence = raw.match(/```(?:[a-z]*)\s*\n([\s\S]*?)```/i);
  return anyFence ? anyFence[1] : null;
}

/**
 * A single option on its own line, e.g. `A) foo`, `B. bar`, `- C: baz`, `[D] foo`.
 *
 * Local models are inconsistent about option layout: the prompt asks for one
 * `Options:` line, but they also commonly emit a bulleted list, one per line, or
 * a bare `A. foo` list. Recognising all of them is the difference between a
 * working multiple-choice question and one that silently degrades to a written
 * answer with its options discarded.
 *
 * A bare letter is deliberately not enough: the separator (`)`, `.`, `:`) is
 * required unless the label is bracketed. Without that, any sentence opening
 * with a capital ("A Level chemistry...") would be eaten as an option.
 */
const OPTION_LINE =
  /^(?:[-*•]\s*)?(?:[\[(]([A-Z])[\])]\s*|([A-Z])\s*[).:]\s*)(.+)$/;

const optionLabel = (line: string): { label: string; text: string } | null => {
  const match = line.match(OPTION_LINE);
  if (!match) return null;
  const text = match[3].trim();
  // A bare "A)" with nothing after it is a label, not an option.
  if (!text) return null;
  return { label: match[1] ?? match[2], text };
};

/**
 * Options written one per line, as long as they run A, B, C... in order.
 *
 * Requiring the run matters: without it, any line beginning "A: " mid-paragraph
 * would be swallowed as an option and pulled out of the question text.
 */
function parseOptionLines(lines: string[]): ParsedOption[] {
  const options: ParsedOption[] = [];
  for (const line of lines) {
    const option = optionLabel(line);
    if (!option) break;
    // Letters must ascend from A, so a stray capitalised sentence is not eaten.
    if (option.label !== String.fromCharCode(65 + options.length)) break;
    options.push(option);
  }
  return options;
}

function parseOptions(line: string | undefined): ParsedOption[] {
  if (!line) return [];
  return line
    .split(/(?=\b[A-Z]\))/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^([A-Z])\)\s*([\s\S]*)$/);
      return match
        ? { label: match[1], text: match[2].trim() }
        : { label: part.slice(0, 1), text: part.slice(1).trim() };
    })
    .filter((option) => option.text.length > 0);
}

const toNumber = (value: string | undefined): number | null => {
  if (!value) return null;
  const match = value.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
};

/** Classifies by the marks the model declared, falling back to the option count. */
function classify(marks: number | null, options: number): QuizQuestionKind {
  if (options >= 2) return "multipleChoice";
  if (marks === null) return "shortAnswer";
  if (marks >= 4) return "longAnswer";
  if (marks === 1) return "multipleChoice";
  return "shortAnswer";
}

/**
 * Splits the block into question sections and mark-scheme sections.
 *
 * Marking is a second pass over the same lines rather than a single interleaved
 * parse, because models emit the scheme either before the questions or all at
 * the end, and the heading tells us which half we are in.
 */
export function parseQuiz(raw: string): ParsedQuiz {
  const warnings: string[] = [];
  const block = extractBlock(raw);

  if (!block) {
    return {
      title: "",
      totalMarks: null,
      timeMinutes: null,
      questions: [],
      warnings: ["The model did not return a quiz block, so no paper could be read."],
    };
  }

  const lines = block.split("\n");
  let title = "";
  let totalMarks: number | null = null;
  let timeMinutes: number | null = null;

  /**
   * One `Qn` block, which may be a question or a mark-scheme entry.
   *
   * The two are collected into the same shape and only told apart at the end,
   * because a model may emit the mark scheme before the questions, after them,
   * or interleaved. Tracking a "which half am I in" flag instead would silently
   * mis-pair the answers in two of those three cases.
   */
  interface Record_ {
    number: number;
    text: string;
    options: ParsedOption[];
    /** Candidate one-per-line options, pending confirmation that they form a run. */
    optionLines: string[];
    marks: number | null;
    answer: string;
    marking: string;
  }

  const records: Record_[] = [];
  let current: Record_ | null = null;

  const flush = () => {
    if (!current) return;
    // An inline `Options:` line wins; the run is only a fallback.
    if (!current.options.length) {
      current.options = parseOptionLines(current.optionLines);
      // Whatever was not actually an option stays part of the question text.
      for (const leftover of current.optionLines.slice(current.options.length)) {
        current.text = `${current.text} ${leftover}`.trim();
      }
    }
    records.push(current);
    current = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const totalMatch = line.match(/^total\s*:\s*(.+)$/i);
    if (totalMatch) {
      totalMarks = toNumber(totalMatch[1]);
      continue;
    }
    const timeMatch = line.match(/^time\s*:\s*(.+)$/i);
    if (timeMatch) {
      timeMinutes = toNumber(timeMatch[1]);
      continue;
    }

    if (/^#\s*paper\s*:/i.test(line)) {
      title = line.replace(/^#\s*paper\s*:\s*/i, "").trim();
      continue;
    }

    // "## Mark scheme" and "### Q1" share the heading syntax, so the mark-scheme
    // heading is matched first. It carries no data of its own.
    if (/^#{1,4}\s*mark\s*(scheme|key)/i.test(line)) {
      flush();
      continue;
    }

    const questionHeading = line.match(/^#{1,4}\s*q(?:uestion)?\s*(\d+)\s*[.:)]?\s*(.*)$/i);
    if (questionHeading) {
      flush();
      current = {
        number: Number(questionHeading[1]),
        text: questionHeading[2].trim(),
        options: [],
        optionLines: [],
        marks: null,
        answer: "",
        marking: "",
      };
      continue;
    }

    if (!current) continue;

    // Field lines are matched whichever kind of block this is, so a scheme
    // entry that also declares marks still parses.
    const optionsMatch = line.match(/^(?:options?|choices?)\s*:\s*(.+)$/i);
    if (optionsMatch) {
      current.options = parseOptions(optionsMatch[1]);
      continue;
    }
    // Options listed one per line under the question. Collected into a buffer
    // rather than read immediately, because whether the run is really an option
    // list is only knowable once a non-option line ends it.
    if (!current.options.length) {
      const asOption = optionLabel(line);
      if (asOption) {
        current.optionLines.push(line);
        continue;
      }
    }
    const marksMatch = line.match(/^marks?\s*:\s*(.+)$/i);
    if (marksMatch) {
      current.marks = toNumber(marksMatch[1]);
      continue;
    }
    const answerMatch = line.match(/^answer\s*:\s*(.+)$/i);
    if (answerMatch) {
      current.answer = answerMatch[1].trim();
      continue;
    }
    const markingMatch = line.match(/^marking\s*:\s*(.+)$/i);
    if (markingMatch) {
      current.marking = markingMatch[1].trim();
      continue;
    }

    // Unlabelled text continues whichever field is already open, falling back to
    // the question text.
    if (current.marking) current.marking += ` ${line}`;
    else if (current.answer) current.answer += ` ${line}`;
    else if (current.text) current.text += ` ${line}`;
    else current.text = line;
  }

  flush();

  // A block is a mark-scheme entry only if it carries an answer or marking
  // notes; that is the only reliable signal when the order is unknown.
  const questionRecords = records.filter((r) => !r.answer && !r.marking && r.text);
  const schemeByNumber = new Map<number, Record_>();
  for (const record of records) {
    if (record.answer || record.marking) schemeByNumber.set(record.number, record);
  }

  const merged: ParsedQuestion[] = questionRecords
    .map((record) => {
      const scheme = schemeByNumber.get(record.number);
      return {
        number: record.number,
        text: record.text,
        kind: classify(record.marks, record.options.length),
        options: record.options,
        marks: record.marks ?? 0,
        answer: scheme?.answer ?? "",
        marking: scheme?.marking ?? "",
      };
    })
    .sort((a, b) => a.number - b.number);

  if (merged.length === 0) {
    warnings.push("The quiz block was found but no questions could be read from it.");
  }

  const missingScheme = merged.filter((q) => !q.answer).length;
  if (missingScheme > 0) {
    warnings.push(
      `${missingScheme} of ${merged.length} questions had no mark-scheme entry, so they cannot be marked.`
    );
  }

  const missingText = merged.filter((q) => !q.text).length;
  if (missingText > 0) {
    warnings.push(`${missingText} question(s) had no question text.`);
  }

  // Trust the questions over the header when they disagree: a student marking
  // themselves needs the marks in front of them to be the real ones.
  const summed = merged.reduce((sum, q) => sum + (q.marks || 0), 0);
  const effectiveTotal = summed > 0 ? summed : totalMarks;

  return {
    title,
    totalMarks: effectiveTotal,
    timeMinutes,
    questions: merged,
    warnings,
  };
}