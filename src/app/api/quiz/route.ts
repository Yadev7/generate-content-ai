import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { getNote } from "@/lib/notes/store";
import { parseQuiz } from "@/lib/quiz/parse";
import {
  buildQuizPrompt,
  MAX_SOURCE_CHARS,
  quizUserMessage,
  QUIZ_MAX_TOKENS,
  type QuizDifficulty,
  type QuizSubject,
} from "@/lib/quiz/prompt";
import { requireFeature, refusalResponse } from "@/lib/subscription/guard";

/**
 * Generates a practice paper or mock exam for a Prime subscriber.
 *
 * Prime-only via `requireFeature`, which re-reads the entitlement from Clerk.
 * The response is parsed here rather than in the browser so the UI receives
 * structured questions, and so a paper that failed to parse is reported as an
 * error instead of an empty sheet.
 *
 * Unlike `/api/chat` this does not consume the daily allowance. It is
 * Prime-only, so an allowance would only ever reject a paying subscriber, and a
 * whole paper is a single expensive request rather than one of many.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LM_BASE_URL = process.env.LM_STUDIO_URL || "http://localhost:1234/v1";
const LM_API_KEY = process.env.LM_STUDIO_API_KEY || "lm-studio";

const SUBJECTS: QuizSubject[] = [
  "maths", "physics", "chemistry", "biology", "english",
  "history", "geography", "computerScience", "general",
];
const DIFFICULTIES: QuizDifficulty[] = ["foundation", "standard", "challenge", "exam"];

const isSubject = (value: unknown): value is QuizSubject =>
  typeof value === "string" && (SUBJECTS as string[]).includes(value);
const isDifficulty = (value: unknown): value is QuizDifficulty =>
  typeof value === "string" && (DIFFICULTIES as string[]).includes(value);

/** Clamps a number into a range, falling back when the value is not a number. */
function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number
): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

/** Model id cache, mirroring the chat route's lazy discovery. */
let discoveredModel: string | null = null;

async function resolveModel(): Promise<string | null> {
  const configured = process.env.LM_STUDIO_MODEL?.trim();
  if (configured) return configured;
  if (discoveredModel) return discoveredModel;
  try {
    const res = await fetch(`${LM_BASE_URL}/models`, {
      headers: { Authorization: `Bearer ${LM_API_KEY}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: { id?: string }[] };
    const id = (data.data ?? [])
      .map((m) => m.id)
      .filter((v): v is string => typeof v === "string" && v.length > 0)
      .filter((v) => !/embed|tts|kokoro|whisper/i.test(v))[0];
    discoveredModel = id ?? null;
    return discoveredModel;
  } catch {
    return null;
  }
}

interface QuizBody {
  subject?: unknown;
  topic?: unknown;
  difficulty?: unknown;
  questionCount?: unknown;
  timeLimitMinutes?: unknown;
  marksPerQuestion?: unknown;
  examBoard?: unknown;
  noteId?: unknown;
}

export async function POST(request: Request) {
  const { userId } = await auth();

  const guard = await requireFeature(userId, "quizGenerator");
  if (!guard.ok) return refusalResponse(guard);

  let body: QuizBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isSubject(body.subject)) {
    return NextResponse.json(
      { error: "Choose a subject.", code: "invalid_subject" },
      { status: 400 }
    );
  }

  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  if (topic.length < 2) {
    return NextResponse.json(
      { error: "Give a topic to build the paper from, e.g. \"quadratic equations\".",
        code: "invalid_topic" },
      { status: 400 }
    );
  }
  if (topic.length > 300) {
    return NextResponse.json(
      { error: "That topic is too long. Keep it under 300 characters.",
        code: "invalid_topic" },
      { status: 400 }
    );
  }

  const model = await resolveModel();
  if (!model) {
    return NextResponse.json(
      {
        error: "No chat model is available. Set LM_STUDIO_MODEL, or load a model in LM Studio.",
        code: "no_model",
      },
      { status: 503 }
    );
  }

  // Optional grounding from an uploaded document. Scoped to the caller, so a
  // noteId belonging to someone else is simply not found.
  let sourceNote: { name: string; text: string } | undefined;
  if (typeof body.noteId === "string" && body.noteId && userId) {
    const note = await getNote(userId, body.noteId);
    // Cap the excerpt: a whole paper plus a whole PDF would not fit the
    // context window, and the paper is the part the student needs.
    if (note) {
      sourceNote = {
        name: note.name,
        text: note.text.slice(0, MAX_SOURCE_CHARS),
      };
    }
  }

  const settings = {
    subject: body.subject,
    topic,
    difficulty: isDifficulty(body.difficulty) ? body.difficulty : "standard",
    questionCount: clampNumber(body.questionCount, 3, 12, 6),
    timeLimitMinutes: clampNumber(body.timeLimitMinutes, 5, 180, 30),
    marksPerQuestion: clampNumber(body.marksPerQuestion, 1, 20, 4),
    examBoard:
      typeof body.examBoard === "string" ? body.examBoard.trim().slice(0, 80) : undefined,
    sourceNote,
  };

  let upstream: Response;
  try {
    upstream = await fetch(`${LM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LM_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: buildQuizPrompt(settings) },
          { role: "user", content: quizUserMessage(settings) },
        ],
        stream: false,
        // Lower than chat: a paper should be consistent, not inventive.
        temperature: 0.4,
        max_tokens: QUIZ_MAX_TOKENS,
      }),
      signal: AbortSignal.timeout(180_000),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "upstream request failed";
    return NextResponse.json(
      { error: `Could not reach the model: ${detail}`, code: "model_unreachable" },
      { status: 502 }
    );
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return NextResponse.json(
      { error: detail || `The model returned status ${upstream.status}`, code: "model_error" },
      { status: 502 }
    );
  }

  const data = (await upstream.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = data.choices?.[0]?.message?.content ?? "";

  if (!raw) {
    return NextResponse.json(
      { error: "The model returned an empty paper.", code: "empty_response" },
      { status: 502 }
    );
  }

  const quiz = parseQuiz(raw);

  // A paper with nothing readable in it is a failure, not an empty quiz. Saying
  // so lets the UI offer a retry instead of showing a student a blank sheet.
  if (quiz.questions.length === 0) {
    return NextResponse.json(
      {
        error: "The model did not return a usable paper. Try again, or narrow the topic.",
        code: "unparsable_quiz",
        warnings: quiz.warnings,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    quiz: {
      title: quiz.title,
      totalMarks: quiz.totalMarks,
      timeMinutes: settings.timeLimitMinutes,
      questions: quiz.questions,
      warnings: quiz.warnings,
    },
    settings: {
      subject: settings.subject,
      topic: settings.topic,
      difficulty: settings.difficulty,
      questionCount: settings.questionCount,
      marksPerQuestion: settings.marksPerQuestion,
      examBoard: settings.examBoard ?? null,
      noteId: sourceNote ? body.noteId : null,
    },
  });
}