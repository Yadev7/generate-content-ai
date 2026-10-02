/**
 * Prompt construction for the Prime quiz / mock-exam generator.
 *
 * Kept apart from `src/lib/chat.ts` because this is not a persona: it is a
 * task with its own inputs (topic, difficulty, question mix, marks) and its own
 * output contract that the UI parses. A persona answers whoever is talking;
 * this produces a structured paper.
 */

export type QuizSubject =
  | "maths"
  | "physics"
  | "chemistry"
  | "biology"
  | "english"
  | "history"
  | "geography"
  | "computerScience"
  | "general";

export type QuizDifficulty = "foundation" | "standard" | "challenge" | "exam";

/** The question shapes a paper can contain. Declared first so `MARKS_BY_KIND` can key off it. */
export type QuizQuestionKind = "multipleChoice" | "shortAnswer" | "longAnswer";

/** Marks available per question type, used for the total. */
export const MARKS_BY_KIND: Record<QuizQuestionKind, number> = {
  multipleChoice: 1,
  shortAnswer: 2,
  longAnswer: 6,
};

export interface QuizRequest {
  subject: QuizSubject;
  /** Free text: "quadratic equations", "Macbeth Act 3", "mitosis". */
  topic: string;
  difficulty: QuizDifficulty;
  /** 3-12. Kept modest because the whole paper must fit one response. */
  questionCount: number;
  /** Minutes the student plans to spend; drives pacing advice. */
  timeLimitMinutes: number;
  /** Marks per question, so the total matches the student's real exam. */
  marksPerQuestion: number;
  /** Optional board/exam name, e.g. "IB MYP", "AQA GCSE", "Edexcel A Level". */
  examBoard?: string;
  /** Extracted text from an uploaded document to build the paper from. */
  sourceNote?: { name: string; text: string };
}

export const SUBJECT_LABELS: Record<QuizSubject, string> = {
  maths: "Mathematics",
  physics: "Physics",
  chemistry: "Chemistry",
  biology: "Biology",
  english: "English Language or Literature",
  history: "History",
  geography: "Geography",
  computerScience: "Computer Science",
  general: "General / mixed subjects",
};

export const DIFFICULTY_LABELS: Record<QuizDifficulty, string> = {
  foundation: "Foundation (recall and single steps)",
  standard: "Standard (typical exam questions)",
  challenge: "Challenge (multi-step and unseen setups)",
  exam: "Exam (hardest, timed-paper standard)",
};

export const DIFFICULTY_GUIDANCE: Record<QuizDifficulty, string> = {
  foundation:
    "Recall a named fact, definition or single-step procedure. One clear recall target per question. Avoid multi-step chains and unseen setups.",
  standard:
    "The questions a student meets in a normal paper: two or three steps, some routine selection, at least one application to an unfamiliar context.",
  challenge:
    "Multi-step problems, unseen setups the student must model themselves, and questions where the obvious method does not apply.",
  exam:
    "The hardest questions in the paper. Include at least one that needs a method the student must choose unaided, and one where a plausible wrong approach leads somewhere reasonable but wrong.",
};

/**
 * Builds the system prompt for a quiz request.
 *
 * The output contract is a fenced `quiz` block rather than free prose, because
 * the UI has to split questions from the answer key and a student marking
 * themselves needs them separated. `parseQuiz` in `parse.ts` is the only thing
 * that reads it.
 */
export function buildQuizPrompt(request: QuizRequest): string {
  const totalMarks = request.marksPerQuestion * request.questionCount;
  const subject = SUBJECT_LABELS[request.subject];
  const mix = questionMix(request);

  const source = request.sourceNote
    ? `Base the paper on this uploaded material. Quote from it and use its own examples and terminology where they fit.

--- BEGIN SOURCE: ${request.sourceNote.name} ---
${request.sourceNote.text}
--- END SOURCE ---`
    : `Use standard ${subject} syllabus content for the topic. Do not invent course-specific facts, and do not cite a syllabus you were not given.`;

  return [
    `You are an ${subject} examiner setting a practice paper for a student.`,
    "",
    "SET THE PAPER",
    `- Subject: ${subject}`,
    `- Topic: ${request.topic}`,
    `- Difficulty: ${request.difficulty} — ${DIFFICULTY_GUIDANCE[request.difficulty]}`,
    `- Questions: exactly ${request.questionCount}`,
    `- Marks per question: ${request.marksPerQuestion} (total ${totalMarks} marks)`,
    `- Time limit: ${request.timeLimitMinutes} minutes`,
    request.examBoard?.trim()
      ? `- Exam board: ${request.examBoard.trim()}`
      : "- Exam board: not specified, so use generic terminology and avoid board-specific phrasing",
    `- Question mix: ${mix}`,
    "",
    "SOURCE MATERIAL",
    source,
    "",
    "OUTPUT CONTRACT",
    "Return exactly one fenced code block and nothing outside it. The opening line is three backticks immediately followed by the word quiz, with no space, and the closing line is three backticks:",
    "```quiz",
    "# Paper: <title>",
    "Total: <n> marks",
    "Time: <n> minutes",
    "",
    "## Q1. <question text>",
    "Marks: <n>",
    "",
    "## Mark scheme",
    "### Q1",
    "Answer: <the answer>",
    "Marking: <how the marks are awarded, one clause per mark>",
    "```",
    "",
    "Then follow this order:",
    "1. A line `# Paper: <title>` with a short exam-style title.",
    "2. A line `Total: <n> marks` and `Time: <n> minutes`.",
    "3. For each question, exactly:",
    "   - `## Q<n>. <question text>`",
    "   - For multiple choice, a line `Options: A) ... | B) ... | C) ... | D) ...`",
    "   - `Marks: <n>`",
    "4. After all questions, a line `## Mark scheme`, then per question:",
    "   - `### Q<n>` followed by `Answer: <the answer>` and `Marking: <how the marks are awarded, one clause per mark>`.",
    "",
    "RULES",
    "- No question may repeat another: different command word, different method or text.",
    "- Every question must be answerable from the topic alone. No hidden instructions in the wording.",
    "- The mark scheme must allocate exactly the stated marks and sum to the total.",
    "- Never invent a fact, a quotation, a date, a formula or a past-paper citation. If a specific value or source would be needed and you are not certain of it, write the question so it does not depend on one, and say so in the marking note.",
    "- Put every formula, equation, expression, set of coordinates or worked calculation inside a separate fenced code block tagged `text`, like this:",
    "```text",
    "x = (-b ± sqrt(b^2 - 4ac)) / 2a",
    "```",
    "  Never use LaTeX and never wrap maths in $ or $$ delimiters; they are not rendered here and will appear as literal characters. Write plain-text maths instead: `a^2 + b^2 = c^2`, units as `N` or `m/s^2`, subscripts as `H2O`, superscripts as `v0`.",
    "- Ask the student to work without notes only in the `Marking:` line, never in the question text.",
    "",
    "After the code block, add nothing.",
  ].join("\n");
}

/**
 * Spreads question types across the requested count.
 *
 * A paper of all multiple choice does not test written technique, and a paper of
 * all six-mark questions is not finishable in the time allowed, so the mix
 * scales with the count.
 */
function questionMix(request: QuizRequest): string {
  const { questionCount, difficulty } = request;
  if (questionCount <= 3) return "all multiple choice";

  // Longer questions earn proportionally more of the paper as it grows.
  const shortAnswer = Math.max(1, Math.round(questionCount * 0.25));
  const longAnswer =
    difficulty === "foundation"
      ? 0
      : Math.max(1, Math.round(questionCount * (questionCount >= 8 ? 0.2 : 0.34)));
  const multipleChoice = Math.max(0, questionCount - shortAnswer - longAnswer);

  const parts: string[] = [];
  if (multipleChoice) parts.push(`${multipleChoice} multiple choice`);
  if (shortAnswer) parts.push(`${shortAnswer} short answer`);
  if (longAnswer) parts.push(`${longAnswer} long answer`);
  return parts.join(", ");
}

/** The user message for a quiz request: short, since the system prompt has the detail. */
export const quizUserMessage = (request: QuizRequest): string =>
  `Set a ${request.difficulty} ${SUBJECT_LABELS[request.subject]} paper on "${request.topic}" with ${request.questionCount} questions worth ${request.marksPerQuestion} marks each.`;

/** Model ceiling for a quiz. A whole paper is much longer than a chat reply. */
export const QUIZ_MAX_TOKENS = Number(process.env.LM_QUIZ_MAX_TOKENS ?? 4096);

/** Cap on source text handed to the model, to protect the context window. */
export const MAX_SOURCE_CHARS = 12_000;