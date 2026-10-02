"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ArrowDown, FileText, GraduationCap, Sparkles, X } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

import Composer from "@/components/chat/Composer";
import EmptyState from "@/components/chat/EmptyState";
import { MessageBubble } from "@/components/chat/MessageBubble";
import Sidebar from "@/components/chat/Sidebar";
import { ErrorBanner, TypingIndicator } from "@/components/chat/Status";
import TopBar from "@/components/chat/TopBar";
import SubscribeDialog from "@/components/subscribe/SubscribeDialog";
import NotesPanel, { type NoteSummary } from "@/components/notes/NotesPanel";
import QuizGenerator from "@/components/quiz/QuizGenerator";
import { Button } from "@/components/ui/button";
import {
  canUsePersona,
  DEFAULT_PERSONA_VALUE,
  personas,
  type AccessContext,
  type ChatMessage,
} from "@/lib/chat";
import { exportChatToPdf } from "@/lib/exportChat";
import { useSubscription } from "@/hooks/useSubscription";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { getPersonaCopy } from "@/lib/i18n/personas";
import { getSpeechLocale } from "@/lib/i18n/locales";

/** Token reveal rate for streamed replies, in ms per character. */
const TYPE_SPEED = 12;
/** Distance from the bottom, in px, that still counts as "following along". */
const STICK_THRESHOLD = 120;
const SIDEBAR_STORAGE_KEY = "sai-sidebar-collapsed";

let messageId = 0;
const nextId = () => `msg-${++messageId}`;

export default function ChatPage() {
  const { t, locale, format } = useI18n();
  const { isLoaded, isSignedIn } = useAuth();
  const subscription = useSubscription();
  const [isSubscribeOpen, setSubscribeOpen] = useState(false);
  // Until Clerk resolves the session we treat the visitor as a guest, which is
  // the safe default: Study Desk always works.
  const hasAccess = isLoaded && isSignedIn;
  // Server-enforced on every request; mirrored here only to render locks.
  // Memoised so the persona memos below are not invalidated every render.
  const access: AccessContext = useMemo(
    () => ({
      isSignedIn: hasAccess,
      isSubscribed: subscription.isSubscribed,
    }),
    [hasAccess, subscription.isSubscribed]
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [personaValue, setPersonaValue] = useState(DEFAULT_PERSONA_VALUE);
  const [language, setLanguage] = useState(getSpeechLocale(locale));
  const [isRecording, setIsRecording] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Free messages left today; `null` for Prime, which is unmetered. */
  const [quotaLeft, setQuotaLeft] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  // Study tools (Prime): course notes + quiz generator, in a drawer above the
  // conversation so the chat layout is untouched when they are closed.
  const [isToolsOpen, setToolsOpen] = useState(false);
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [quizSourceNoteId, setQuizSourceNoteId] = useState<string | null>(null);
  /** Note currently attached to the chat, so the tutor answers from it. */
  const [chatNote, setChatNote] = useState<NoteSummary | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  /** Tracks whether the user has scrolled up, so we stop yanking them down. */
  const stickToBottomRef = useRef(true);
  const messagesRef = useRef<ChatMessage[]>([]);

  messagesRef.current = messages;

  const activePersona = useMemo(
    () => personas.find((p) => p.value === personaValue),
    [personaValue]
  );

  const activePersonaCopy = useMemo(
    () =>
      activePersona ? getPersonaCopy(locale, activePersona.id) : undefined,
    [activePersona, locale]
  );

  // Which persona id we ask the server for. A locked tutor is downgraded here
  // so the UI never sits in a state the server would reject, e.g. when a
  // subscription lapses or the session ends mid-session.
  const requestedPersonaId = useMemo(() => {
    if (activePersona && canUsePersona(activePersona, access)) {
      return activePersona.id;
    }
    return "general";
  }, [activePersona, access]);

  // If access is lost (session ended, plan expired) while a restricted tutor is
  // selected, drop straight back to Study Desk.
  useEffect(() => {
    if (!isLoaded || !subscription.isLoaded) return;
    if (activePersona && !canUsePersona(activePersona, access)) {
      setPersonaValue(DEFAULT_PERSONA_VALUE);
    }
  }, [activePersona, access, isLoaded, subscription.isLoaded]);

  // Drop an attached document the moment it is gone (deleted elsewhere) or the
  // plan that unlocked grounding lapses, so the chip never advertises a source
  // the server would refuse.
  useEffect(() => {
    if (chatNote && !notes.some((n) => n.id === chatNote.id)) {
      setChatNote(null);
    }
  }, [chatNote, notes]);

  useEffect(() => {
    if (subscription.isLoaded && !subscription.isSubscribed) {
      setChatNote(null);
    }
  }, [subscription.isLoaded, subscription.isSubscribed]);

  // Restore and persist the desktop sidebar visibility choice.
  useEffect(() => {
    try {
      setSidebarCollapsed(
        window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1"
      );
    } catch {
      // Storage unavailable; fall back to the visible default.
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // Non-fatal: the toggle still works for this session.
      }
      return next;
    });
  }, []);

  const cancelTyping = useCallback(() => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  }, []);

  const stopStream = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    cancelTyping();
  }, [cancelTyping]);

  // Clean up in-flight work when the page unmounts.
  useEffect(() => {
    const recognition = recognitionRef.current;
    return () => {
      stopStream();
      recognition?.abort();
    };
  }, [stopStream]);

  useEffect(() => {
    setVoiceSupported(
      typeof window !== "undefined" && "webkitSpeechRecognition" in window
    );
  }, []);

  // Auto-scroll, but only when the user is already following along.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      const distanceFromBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight;
      const isAtBottom = distanceFromBottom <= STICK_THRESHOLD;
      stickToBottomRef.current = isAtBottom;
      setShowScrollButton(!isAtBottom);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (stickToBottomRef.current) {
      bottomRef.current?.scrollIntoView({ block: "end" });
    }
  }, [messages, isBusy]);

  const scrollToBottom = useCallback(() => {
    stickToBottomRef.current = true;
    setShowScrollButton(false);
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  const runCompletion = useCallback(
    async (history: ChatMessage[], personaId: string, noteId?: string | null) => {
      stopStream();
      setError(null);
      setIsBusy(true);

      const controller = new AbortController();
      abortRef.current = controller;

      const botId = nextId();
      setMessages((prev) => [
        ...prev,
        { id: botId, role: "bot", content: "", status: "streaming" },
      ]);

      const patchBot = (patch: Partial<ChatMessage>) =>
        setMessages((prev) =>
          prev.map((m) => (m.id === botId ? { ...m, ...patch } : m))
        );

      try {
        // Only the tutor id travels to the server: the system prompt and the
      // entitlement check both live server-side, so a locked tutor cannot be
      // reached by editing this request.
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          personaId,
          noteId: noteId ?? undefined,
          messages: history.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        // A lapsed or absent entitlement re-opens the right upgrade path
        // instead of surfacing a raw error. The same applies once the free
        // daily allowance is spent, so the cap reads as an offer, not a crash.
        if (response.status === 403 && data?.code === "subscription_required") {
          setSubscribeOpen(true);
        } else if (response.status === 429 && data?.code === "limit_reached") {
          setSubscribeOpen(true);
          setQuotaLeft(0);
        } else if (response.status === 404 && data?.code === "note_not_found") {
          // The attached document was deleted elsewhere; drop it and explain.
          setChatNote(null);
          throw new Error(data?.error ?? t.status.requestFailed);
        } else {
          throw new Error(data?.error ?? t.status.requestFailed);
        }
        return;
      }

      // Keep the "N free messages left" counter honest after each reply.
      if (data?.quota && typeof data.quota.remaining === "number") {
        setQuotaLeft(data.quota.remaining);
      }

      const generatedText: string | undefined = data?.content;

      if (!generatedText) {
          throw new Error(t.errors.emptyResponse);
        }

        // Reveal the reply progressively for a more natural feel.
        let index = 0;
        const step = () => {
          if (index >= generatedText.length) {
            patchBot({ content: generatedText, status: "complete" });
            typingTimerRef.current = null;
            return;
          }

          index += 2;
          patchBot({ content: generatedText.slice(0, index) });
          typingTimerRef.current = setTimeout(step, TYPE_SPEED);
        };
        step();
      } catch (err) {
        const isAbort =
          err instanceof DOMException && err.name === "AbortError";

        if (isAbort) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === botId
                ? m.content
                  ? { ...m, status: "complete" }
                  : null
                : m
            ).filter((m): m is ChatMessage => m !== null)
          );
        } else {
          cancelTyping();
          const message =
            err instanceof Error ? err.message : "Unexpected error";
          patchBot({ content: message, status: "error" });
          setError(message);
        }
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setIsBusy(false);
        }
      }
    },
    [cancelTyping, stopStream, t.errors.emptyResponse, t.status.requestFailed]
  );

  const sendMessage = useCallback(
    (text: string, noteId: string | null = chatNote?.id ?? null) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const history = messagesRef.current;
      const userMessage: ChatMessage = {
        id: nextId(),
        role: "user",
        content: trimmed,
        status: "complete",
      };

      setInput("");
      setError(null);
      stickToBottomRef.current = true;
      setMessages((prev) => [...prev, userMessage]);

      void runCompletion([...history, userMessage], requestedPersonaId, noteId);
    },
    [runCompletion, requestedPersonaId, chatNote]
  );

  const handleRetry = useCallback(() => {
    const history = messagesRef.current;
    const lastUserIndex = [...history]
      .map((m) => m.role)
      .lastIndexOf("user");
    if (lastUserIndex === -1) return;

    // Drop the failed reply and anything after it, then re-ask.
    const truncated = history.slice(0, lastUserIndex + 1);
    setMessages(truncated);
    stickToBottomRef.current = true;
    void runCompletion(truncated, requestedPersonaId, chatNote?.id ?? null);
  }, [runCompletion, requestedPersonaId, chatNote]);

  const handleAskNote = useCallback((note: NoteSummary) => {
    setChatNote(note);
    // Close the tools drawer so the attached-source chip and composer are visible.
    setToolsOpen(false);
  }, []);

  const handleSummarizeNote = useCallback(() => {
    if (!chatNote) return;
    sendMessage(t.notes.summarizeRequest, chatNote.id);
  }, [chatNote, sendMessage, t.notes.summarizeRequest]);

  const handleNewChat = useCallback(() => {
    stopStream();
    recognitionRef.current?.abort();
    setIsRecording(false);
    setMessages([]);
    setInput("");
    setError(null);
    setIsBusy(false);
    stickToBottomRef.current = true;
    messagesRef.current = [];
    inputRef.current?.focus();
  }, [stopStream]);

  const handleSelectPersona = useCallback((value: string) => {
    setPersonaValue(value);
    setSidebarOpen(false);
  }, []);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      await exportChatToPdf(messagesRef.current);
    } catch {
      setError(t.errors.pdfFailed);
    } finally {
      setIsExporting(false);
    }
  }, [t.errors.pdfFailed]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    if (!("webkitSpeechRecognition" in window)) return;

    const SpeechRecognitionCtor = (
      window as unknown as {
        webkitSpeechRecognition: new () => SpeechRecognition;
      }
    ).webkitSpeechRecognition;

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = language;

    const baseText = input.trim();

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput([baseText, transcript].filter(Boolean).join(" "));
    };

    recognition.onerror = (event) => {
      setError(
        event.error === "not-allowed"
          ? t.errors.microphoneDenied
          : `${t.errors.dictationFailed} (${event.error})`
      );
    };

    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setIsRecording(true);
    recognition.start();
  }, [input, isRecording, language, t.errors.dictationFailed, t.errors.microphoneDenied]);

  // Keep dictation in step with the interface language unless the user has
  // explicitly picked a different voice language.
  useEffect(() => {
    setLanguage(getSpeechLocale(locale));
  }, [locale]);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      <Sidebar
        personas={personas}
        activePersonaValue={personaValue}
        onSelectPersona={handleSelectPersona}
        onNewChat={handleNewChat}
        onCollapse={toggleSidebar}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        hasMessages={messages.length > 0}
        access={access}
        onRequestSubscribe={() => setSubscribeOpen(true)}
      />

      <SubscribeDialog
        open={isSubscribeOpen}
        onClose={() => setSubscribeOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          activePersonaCopy={activePersonaCopy}
          onOpenSidebar={() => setSidebarOpen(true)}
          onExpandSidebar={toggleSidebar}
          sidebarHidden={sidebarCollapsed}
          onNewChat={handleNewChat}
          onExport={handleExport}
          canExport={messages.length > 0 && !isExporting}
          isExporting={isExporting}
        />

        <div className="relative flex min-h-0 flex-1 flex-col">
          {/* Study tools drawer. Sits above the transcript so the chat layout is
              untouched until a student opens it. */}
          {isToolsOpen && (
            <div className="max-h-[70dvh] overflow-y-auto border-b bg-muted/30 px-4 py-4">
              <div className="mx-auto w-full max-w-3xl">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <GraduationCap className="size-4 text-primary" />
                    {t.quiz.title}
                  </h2>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={t.sidebar.close}
                    onClick={() => setToolsOpen(false)}
                    data-testid="tools-close"
                  >
                    <X className="size-4" />
                  </Button>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <NotesPanel
                    onNotesChanged={setNotes}
                    selectedNoteId={quizSourceNoteId}
                    onSelectNote={setQuizSourceNoteId}
                    onAskNote={handleAskNote}
                    askingNoteId={chatNote?.id ?? null}
                    onRequestSubscribe={() => setSubscribeOpen(true)}
                  />
                  <QuizGenerator
                    notes={notes.map((note) => ({ id: note.id, name: note.name }))}
                    selectedNoteId={quizSourceNoteId}
                    onRequestSubscribe={() => setSubscribeOpen(true)}
                  />
                </div>
              </div>
            </div>
          )}

          <div
            ref={scrollRef}
            className="scrollbar-slim flex-1 overflow-y-auto overscroll-contain"
          >
            {messages.length === 0 ? (
              <EmptyState
                activePersonaCopy={activePersonaCopy}
                onPickSuggestion={sendMessage}
              />
            ) : (
              <div className="mx-auto w-full max-w-3xl px-4 py-6">
                <div className="space-y-6">
                  {messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isStreaming={message.status === "streaming"}
                      onRetry={
                        message.status === "error" ? handleRetry : undefined
                      }
                    />
                  ))}
                  {isBusy &&
                    messages[messages.length - 1]?.status !== "streaming" && (
                      <TypingIndicator />
                    )}
                </div>
              </div>
            )}

            <div ref={bottomRef} className="h-1" />
          </div>

          {showScrollButton && messages.length > 0 && (
            <button
              type="button"
              onClick={scrollToBottom}
              aria-label="Scroll to latest message"
              className="absolute bottom-4 left-1/2 flex size-9 -translate-x-1/2 animate-fade-in items-center justify-center rounded-full border bg-card text-muted-foreground shadow-panel transition-colors hover:text-foreground"
            >
              <ArrowDown className="size-4" />
            </button>
          )}
        </div>

        {error && (
          <div className="px-4 pb-1">
            <div className="mx-auto w-full max-w-3xl">
              <ErrorBanner
                message={error}
                onRetry={messages.length > 0 ? handleRetry : undefined}
                onDismiss={() => setError(null)}
              />
            </div>
          </div>
        )}

        <div className="mx-auto w-full max-w-3xl px-4">
            <div className="mb-2 flex justify-end">
              <Button
                size="xs"
                variant={isToolsOpen ? "default" : "outline"}
                onClick={() => setToolsOpen((open) => !open)}
                aria-expanded={isToolsOpen}
                data-testid="tools-toggle"
              >
                <GraduationCap className="size-3.5" />
                {isToolsOpen ? t.quiz.title : t.notes.title}
              </Button>
            </div>
          </div>

          {chatNote && (
            <div className="mx-auto w-full max-w-3xl px-4 pb-2">
              <div
                className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1.5"
                data-testid="chat-source"
              >
                <FileText className="size-3.5 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate text-xs">
                  {format(t.notes.chatSourceLabel, { name: chatNote.name })}
                </span>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={handleSummarizeNote}
                  disabled={isBusy}
                  data-testid="chat-source-summarize"
                >
                  <Sparkles className="size-3" />
                  {t.notes.summarize}
                </Button>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  aria-label={t.notes.chatSourceClear}
                  onClick={() => setChatNote(null)}
                  data-testid="chat-source-clear"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            </div>
          )}

          <Composer
          value={input}
          onChange={setInput}
          onSubmit={() => sendMessage(input)}
          onVoiceToggle={toggleRecording}
          isRecording={isRecording}
          isBusy={isBusy}
          language={language}
          onLanguageChange={setLanguage}
          voiceSupported={voiceSupported}
          quotaLeft={quotaLeft}
          inputRef={inputRef}
        />
      </div>
    </div>
  );
}
