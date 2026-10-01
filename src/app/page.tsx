"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ArrowDown } from "lucide-react";

import Composer from "@/components/chat/Composer";
import EmptyState from "@/components/chat/EmptyState";
import { MessageBubble } from "@/components/chat/MessageBubble";
import Sidebar from "@/components/chat/Sidebar";
import { ErrorBanner, TypingIndicator } from "@/components/chat/Status";
import TopBar from "@/components/chat/TopBar";
import {
  DEFAULT_PERSONA_VALUE,
  personas,
  type ChatMessage,
} from "@/lib/chat";
import { exportChatToPdf } from "@/lib/exportChat";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { getPersonaCopy } from "@/lib/i18n/personas";
import { getSpeechLocale } from "@/lib/i18n/locales";

const LM_STUDIO_BASE_URL =
  process.env.NEXT_PUBLIC_LM_STUDIO_URL || "http://localhost:1234/v1";
const LM_STUDIO_API_KEY = process.env.NEXT_PUBLIC_LM_STUDIO_API_KEY || "lm-studio";
const LM_STUDIO_MODEL = process.env.NEXT_PUBLIC_LM_STUDIO_MODEL || "";

/** Token reveal rate for streamed replies, in ms per character. */
const TYPE_SPEED = 12;
/** Distance from the bottom, in px, that still counts as "following along". */
const STICK_THRESHOLD = 120;
const SIDEBAR_STORAGE_KEY = "sai-sidebar-collapsed";

let messageId = 0;
const nextId = () => `msg-${++messageId}`;

export default function ChatPage() {
  const { t, locale } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [personaValue, setPersonaValue] = useState(DEFAULT_PERSONA_VALUE);
  const [language, setLanguage] = useState(getSpeechLocale(locale));
  const [isRecording, setIsRecording] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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
    async (history: ChatMessage[], systemPrompt: string) => {
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
        const response = await fetch(`${LM_STUDIO_BASE_URL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LM_STUDIO_API_KEY}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: LM_STUDIO_MODEL,
            messages: [
              { role: "system", content: systemPrompt },
              ...history.map((m) => ({
                role: m.role === "bot" ? "assistant" : "user",
                content: m.content,
              })),
            ],
            stream: false,
          }),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(
            body?.error?.message ?? `Request failed with status ${response.status}`
          );
        }

        const data = await response.json();
        const generatedText: string | undefined = data?.choices?.[0]?.message?.content;

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
    [cancelTyping, stopStream, t.errors.emptyResponse]
  );

  const sendMessage = useCallback(
    (text: string) => {
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

      void runCompletion(
        [...history, userMessage],
        personaValue || DEFAULT_PERSONA_VALUE
      );
    },
    [personaValue, runCompletion]
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
    void runCompletion(truncated, personaValue || DEFAULT_PERSONA_VALUE);
  }, [personaValue, runCompletion]);

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
          inputRef={inputRef}
        />
      </div>
    </div>
  );
}
