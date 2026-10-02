"use client";

import { useCallback, useState } from "react";
import { CheckCircle2, ClipboardList, Eye, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { useClerk } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import {
  DIFFICULTY_LABELS,
  SUBJECT_LABELS,
  type QuizDifficulty,
  type QuizQuestionKind,
  type QuizSubject,
} from "@/lib/quiz/prompt";
import type { ParsedOption } from "@/lib/quiz/parse";
import { cn } from "@/lib/utils";

/**
 * Practice paper / mock exam generator (Prime).
 *
 * The flow is deliberately attempt-then-reveal: the student answers every
 * question and only then sees the mark scheme. Showing answers as they are
 * generated turns revision into reading, and this is the feature that is sold
 * on "test yourself".
 *
 * The mark scheme is server-side in `ParsedQuestion.answer`/`marking`, so it is
 * already in the browser payload. That is a deliberate trade-off, not an
 * oversight: it keeps the mark button instant and offline-capable. It does mean
 * a determined student could read the answers from devtools, which is no
 * different from the answer key at the back of a textbook.
 */

export interface QuizQuestion {
  number: number;
  text: string;
  kind: QuizQuestionKind;
  options: ParsedOption[];
  marks: number;
  answer: string;
  marking: string;
}

export interface QuizPaper {
  title: string;
  totalMarks: number | null;
  timeMinutes: number | null;
  questions: QuizQuestion[];
  warnings: string[];
}

interface QuizGeneratorProps {
  /** Notes available as a paper source, from the notes panel. */
  notes?: { id: string; name: string }[];
  selectedNoteId?: string | null;
  onRequestSubscribe?: () => void;
  className?: string;
}

const SUBJECTS = Object.keys(SUBJECT_LABELS) as QuizSubject[];
const DIFFICULTIES = Object.keys(DIFFICULTY_LABELS) as QuizDifficulty[];

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-background px-2.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function QuizGenerator({
  notes = [],
  selectedNoteId,
  onRequestSubscribe,
  className,
}: QuizGeneratorProps) {
  const { t } = useI18n();
  const { can, lockReason } = useFeatureAccess();
  const { openSignIn, openSignUp } = useClerk();

  const [subject, setSubject] = useState<QuizSubject>("physics");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<QuizDifficulty>("standard");
  const [questionCount, setQuestionCount] = useState(6);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(30);
  const [marksPerQuestion, setMarksPerQuestion] = useState(4);
  const [examBoard, setExamBoard] = useState("");
  const [noteId, setNoteId] = useState<string>("");

  const [paper, setPaper] = useState<QuizPaper | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allowed = can("quizGenerator");
  const reason = lockReason("quizGenerator");
  const effectiveNoteId = noteId || selectedNoteId || "";

  const reset = useCallback(() => {
    setPaper(null);
    setAnswers({});
    setRevealed(false);
    setError(null);
  }, []);

  const generate = async () => {
    if (!allowed) {
      // An account is a precondition for paying, so route a guest to sign-in
      // rather than to a checkout they cannot complete.
      if (reason === "signin_required") {
        if (openSignIn) openSignIn();
        else if (openSignUp) openSignUp();
      } else {
        onRequestSubscribe?.();
      }
      return;
    }
    if (topic.trim().length < 2) {
      setError(t.quiz.topicRequired);
      return;
    }

    setError(null);
    setIsGenerating(true);
    setRevealed(false);
    setAnswers({});

    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          topic: topic.trim(),
          difficulty,
          questionCount,
          timeLimitMinutes,
          marksPerQuestion,
          examBoard: examBoard.trim() || undefined,
          noteId: effectiveNoteId || undefined,
        }),
      });
      const data = await res.json().catch(() => null);

      if (res.status === 401 || res.status === 403) {
        setError(
          data?.code === "signin_required" ? t.quiz.signInToUse : t.quiz.primeOnly
        );
        return;
      }
      if (!res.ok) {
        setError(data?.error ?? t.quiz.generateFailed);
        return;
      }
      if (!data?.quiz?.questions?.length) {
        setError(t.quiz.generateFailed);
        return;
      }
      setPaper(data.quiz as QuizPaper);
    } catch {
      setError(t.quiz.generateFailed);
    } finally {
      setIsGenerating(false);
    }
  };

  const answeredCount = paper
    ? paper.questions.filter((q) => (answers[q.number] ?? "").trim().length > 0).length
    : 0;

  // ---------------- setup ----------------
  if (!paper) {
    return (
      <section
        data-testid="quiz-generator"
        aria-label={t.quiz.title}
        className={cn("rounded-xl border bg-card p-4", className)}
      >
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <ClipboardList className="size-4 text-primary" />
          {t.quiz.title}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">{t.quiz.subtitle}</p>

        {!allowed && (
          <p
            className="mt-3 rounded-lg border border-dashed p-3 text-xs text-muted-foreground"
            data-testid="quiz-locked"
          >
            {reason === "signin_required" ? t.quiz.signInToUse : t.quiz.primeOnly}
          </p>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[0.6875rem] font-medium text-muted-foreground">
              {t.quiz.subject}
            </span>
            <select
              value={subject}
              onChange={(event) => setSubject(event.target.value as QuizSubject)}
              className={selectClass}
              data-testid="quiz-subject"
              disabled={!allowed}
            >
              {SUBJECTS.map((value) => (
                <option key={value} value={value}>
                  {SUBJECT_LABELS[value]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-[0.6875rem] font-medium text-muted-foreground">
              {t.quiz.difficulty}
            </span>
            <select
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value as QuizDifficulty)}
              className={selectClass}
              data-testid="quiz-difficulty"
              disabled={!allowed}
            >
              {DIFFICULTIES.map((value) => (
                <option key={value} value={value}>
                  {DIFFICULTY_LABELS[value]}
                </option>
              ))}
            </select>
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[0.6875rem] font-medium text-muted-foreground">
              {t.quiz.topic}
            </span>
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder={t.quiz.topicPlaceholder}
              className={selectClass}
              data-testid="quiz-topic"
              disabled={!allowed || isGenerating}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[0.6875rem] font-medium text-muted-foreground">
              {t.quiz.questions}
            </span>
            <input
              type="number"
              min={3}
              max={12}
              value={questionCount}
              onChange={(event) => setQuestionCount(Number(event.target.value))}
              className={selectClass}
              data-testid="quiz-count"
              disabled={!allowed || isGenerating}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[0.6875rem] font-medium text-muted-foreground">
              {t.quiz.marksPerQuestion}
            </span>
            <input
              type="number"
              min={1}
              max={20}
              value={marksPerQuestion}
              onChange={(event) => setMarksPerQuestion(Number(event.target.value))}
              className={selectClass}
              data-testid="quiz-marks"
              disabled={!allowed || isGenerating}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[0.6875rem] font-medium text-muted-foreground">
              {t.quiz.timeLimit}
            </span>
            <input
              type="number"
              min={5}
              max={180}
              value={timeLimitMinutes}
              onChange={(event) => setTimeLimitMinutes(Number(event.target.value))}
              className={selectClass}
              data-testid="quiz-time"
              disabled={!allowed || isGenerating}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[0.6875rem] font-medium text-muted-foreground">
              {t.quiz.examBoard}
            </span>
            <input
              value={examBoard}
              onChange={(event) => setExamBoard(event.target.value)}
              placeholder={t.quiz.examBoardPlaceholder}
              className={selectClass}
              data-testid="quiz-board"
              disabled={!allowed || isGenerating}
            />
          </label>

          {notes.length > 0 && (
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-[0.6875rem] font-medium text-muted-foreground">
                {t.quiz.buildFromNote}
              </span>
              <select
                value={effectiveNoteId}
                onChange={(event) => setNoteId(event.target.value)}
                className={selectClass}
                data-testid="quiz-note"
                disabled={!allowed || isGenerating}
              >
                <option value="">{t.quiz.noNote}</option>
                {notes.map((note) => (
                  <option key={note.id} value={note.id}>
                    {note.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-3 text-xs text-destructive" data-testid="quiz-error">
            {error}
          </p>
        )}

        <Button
          className="mt-4 w-full"
          onClick={() => void generate()}
          disabled={isGenerating}
          data-testid="quiz-generate"
        >
          {isGenerating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {isGenerating ? t.quiz.generating : t.quiz.generate}
        </Button>
      </section>
    );
  }

  // ---------------- paper ----------------
  return (
    <section
      data-testid="quiz-paper"
      aria-label={paper.title || t.quiz.title}
      className={cn("rounded-xl border bg-card p-4", className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">
            {paper.title || t.quiz.untitledPaper}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t.quiz.paperMeta
              .replace("{marks}", String(paper.totalMarks ?? 0))
              .replace("{minutes}", String(paper.timeMinutes ?? timeLimitMinutes))}
          </p>
        </div>
        <Button size="xs" variant="ghost" onClick={reset} data-testid="quiz-reset">
          <RotateCcw className="size-3.5" />
          {t.quiz.newPaper}
        </Button>
      </div>

      {paper.warnings.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-lg border border-dashed p-2.5 text-[0.6875rem] text-muted-foreground">
          {paper.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}

      <ol className="mt-4 space-y-4">
        {paper.questions.map((question) => (
          <li key={question.number} className="border-b pb-4 last:border-0 last:pb-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">
                <span className="text-muted-foreground">Q{question.number}.</span>{" "}
                {question.text}
              </p>
              <span className="shrink-0 text-[0.6875rem] text-muted-foreground">
                [{question.marks}]
              </span>
            </div>

            {question.kind === "multipleChoice" && question.options.length > 0 ? (
              <div className="mt-2 space-y-1">
                {question.options.map((option) => {
                  const selected = answers[question.number] === option.label;
                  return (
                    <button
                      key={option.label}
                      type="button"
                      disabled={revealed}
                      onClick={() =>
                        setAnswers((prev) => ({ ...prev, [question.number]: option.label }))
                      }
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-start text-xs transition-colors disabled:opacity-70",
                        selected
                          ? "border-primary bg-primary/10"
                          : "hover:bg-accent/50"
                      )}
                      data-testid={`quiz-option-${question.number}-${option.label}`}
                    >
                      <span className="font-semibold">{option.label}</span>
                      <span>{option.text}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <textarea
                value={answers[question.number] ?? ""}
                onChange={(event) =>
                  setAnswers((prev) => ({ ...prev, [question.number]: event.target.value }))
                }
                disabled={revealed}
                rows={question.kind === "longAnswer" ? 4 : 2}
                placeholder={t.quiz.yourAnswer}
                className="mt-2 w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70"
                data-testid={`quiz-answer-${question.number}`}
              />
            )}

            {revealed && question.answer && (
              <div
                className="mt-2 rounded-md border border-primary/30 bg-primary/5 p-2.5 text-xs"
                data-testid={`quiz-scheme-${question.number}`}
              >
                <p className="flex items-start gap-1.5 font-medium">
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  {t.quiz.answer}: {question.answer}
                </p>
                {question.marking && (
                  <p className="mt-1 text-muted-foreground">
                    {t.quiz.marking}: {question.marking}
                  </p>
                )}
                {(answers[question.number] ?? "").trim().length > 0 && (
                  <p className="mt-1 text-muted-foreground">
                    {t.quiz.youWrote}: {(answers[question.number] ?? "").trim()}
                  </p>
                )}
              </div>
            )}
          </li>
        ))}
      </ol>

      {!revealed ? (
        <Button
          className="mt-4 w-full"
          variant={answeredCount < paper.questions.length ? "outline" : "default"}
          onClick={() => setRevealed(true)}
          data-testid="quiz-reveal"
        >
          <Eye className="size-4" />
          {answeredCount < paper.questions.length
            ? t.quiz.revealWithUnanswered.replace("{n}", String(paper.questions.length - answeredCount))
            : t.quiz.reveal}
        </Button>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
          {t.quiz.selfMarkHint}
        </p>
      )}
    </section>
  );
}