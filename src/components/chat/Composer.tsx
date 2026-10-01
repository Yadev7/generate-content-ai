"use client";

import { useEffect, useRef } from "react";
import { Mic, Send, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { languages } from "@/lib/chat";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

const MAX_TEXTAREA_HEIGHT = 200;

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onVoiceToggle: () => void;
  isRecording: boolean;
  isBusy: boolean;
  language: string;
  onLanguageChange: (value: string) => void;
  voiceSupported: boolean;
  inputRef?: React.RefObject<HTMLTextAreaElement>;
}

export default function Composer({
  value,
  onChange,
  onSubmit,
  onVoiceToggle,
  isRecording,
  isBusy,
  language,
  onLanguageChange,
  voiceSupported,
  inputRef: externalRef,
}: ComposerProps) {
  const { t } = useI18n();
  const localRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalRef ?? localRef;

  // Grow with the content up to a cap, then scroll internally.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
    el.style.overflowY = el.scrollHeight > MAX_TEXTAREA_HEIGHT ? "auto" : "hidden";
  }, [value, textareaRef]);

  const canSend = value.trim().length > 0 && !isBusy;

  return (
    <div className="border-t bg-background/80 backdrop-blur-md">
      <div className="mx-auto w-full max-w-3xl px-4 py-4">
        <div
          className={cn(
            "flex items-end gap-2 rounded-2xl border bg-card p-2 shadow-raised transition-colors",
            "focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20"
          )}
        >
          <label htmlFor="composer" className="sr-only">
            {t.composer.label}
          </label>
          <textarea
            id="composer"
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (canSend) onSubmit();
              }
            }}
            placeholder={t.composer.placeholder}
            className="scrollbar-slim max-h-[200px] min-h-[2.5rem] flex-1 resize-none bg-transparent px-2 py-2 text-[0.9375rem] leading-6 outline-none placeholder:text-muted-foreground"
          />

          <div className="flex shrink-0 items-center gap-1">
            {voiceSupported && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onVoiceToggle}
                aria-label={isRecording ? t.composer.voiceStop : t.composer.voiceStart}
                aria-pressed={isRecording}
                title={isRecording ? t.composer.voiceStop : t.composer.voiceStart}
                className={cn(
                  "rounded-xl",
                  isRecording
                    ? "animate-recording-pulse bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive"
                    : "text-muted-foreground"
                )}
              >
                {isRecording ? <Square className="fill-current" /> : <Mic />}
              </Button>
            )}

            <Button
              size="icon"
              onClick={onSubmit}
              disabled={!canSend}
              aria-label={t.composer.sendAria}
              title={t.composer.sendTitle}
              className="rounded-xl"
            >
              <Send className="-translate-x-px rtl:translate-x-px rtl:rotate-180" />
            </Button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
          <p className="text-xs text-muted-foreground">
            <kbd className="rounded border bg-muted px-1 py-0.5 font-sans text-[0.65rem] font-medium">
              Enter
            </kbd>{" "}
            {t.composer.hintSend} ·{" "}
            <kbd className="rounded border bg-muted px-1 py-0.5 font-sans text-[0.65rem] font-medium">
              Shift
            </kbd>
            +
            <kbd className="rounded border bg-muted px-1 py-0.5 font-sans text-[0.65rem] font-medium">
              Enter
            </kbd>{" "}
            {t.composer.hintNewline}
          </p>

          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="hidden sm:inline">{t.composer.voiceLanguage}</span>
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              aria-label={t.composer.voiceLanguage}
              className="cursor-pointer rounded-md border bg-transparent px-1.5 py-1 text-xs text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              {languages.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}