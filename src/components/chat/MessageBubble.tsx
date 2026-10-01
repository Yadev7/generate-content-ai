"use client";

import { memo, useState } from "react";
import Image from "next/image";
import { Check, CircleAlert, Copy, Sparkles, User } from "lucide-react";

import Markdown from "@/components/chat/LazilyRenderedMarkdown";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/chat";

function useCopy() {
  const [copied, setCopied] = useState(false);

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Ignore clipboard permission failures.
    }
  };

  return { copied, copy };
}

function BubbleActions({
  content,
  onRetry,
}: {
  content: string;
  onRetry?: () => void;
}) {
  const { copied, copy } = useCopy();

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 opacity-0 transition-opacity duration-150",
        "focus-within:opacity-100 hover:opacity-100 group-hover:opacity-100",
        // Touch devices have no hover, so keep the controls always reachable.
        "max-sm:opacity-100"
      )}
    >
      {onRetry && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          onClick={onRetry}
          title="Regenerate response"
          aria-label="Regenerate response"
        >
          <Sparkles />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground"
        onClick={() => copy(content)}
        title={copied ? "Copied" : "Copy message"}
        aria-label={copied ? "Message copied" : "Copy message"}
      >
        {copied ? <Check className="text-success" /> : <Copy />}
      </Button>
    </div>
  );
}

function MessageBubbleImpl({
  message,
  isStreaming,
  onRetry,
}: {
  message: ChatMessage;
  isStreaming: boolean;
  onRetry?: () => void;
}) {
  const isUser = message.role === "user";
  const isError = message.status === "error";

  return (
    <div
      className={cn(
        "group flex w-full gap-3 animate-fade-in-up",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div className="shrink-0 pt-0.5">
        {isUser ? (
          <div
            className="flex size-8 items-center justify-center rounded-full border bg-secondary text-secondary-foreground"
            aria-hidden
          >
            <User className="size-4" />
          </div>
        ) : (
          <div
            className="relative flex size-8 items-center justify-center overflow-hidden rounded-full border bg-primary/10"
            aria-hidden
          >
            <Image
              src="/logo.png"
              alt=""
              width={32}
              height={32}
              className="size-8 object-cover"
            />
          </div>
        )}
      </div>

      <div
        className={cn(
          "flex min-w-0 max-w-[min(46rem,88%)] flex-col gap-1",
          isUser ? "items-end" : "items-start"
        )}
      >
        <span className="px-1 text-xs font-medium text-muted-foreground">
          {isUser ? "You" : "SAI"}
        </span>

        <div
          className={cn(
            "group/bubble relative rounded-2xl px-4 py-3 shadow-subtle",
            isUser
              ? "rounded-tr-sm bg-primary text-primary-foreground"
              : cn(
                  "rounded-tl-sm border bg-card text-card-foreground",
                  isError && "border-destructive/40 bg-destructive/5"
                )
          )}
        >
          {isError && (
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-destructive">
              <CircleAlert className="size-4 shrink-0" />
              Something went wrong
            </p>
          )}

          {isUser ? (
            <p className="whitespace-pre-wrap break-words text-[0.9375rem] leading-7">
              {message.content}
            </p>
          ) : (
            <Markdown content={message.content} />
          )}

          {isStreaming && (
            <span
              className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-caret-blink rounded-full bg-current align-text-bottom"
              aria-hidden
            />
          )}
        </div>

        {!isStreaming && message.content.length > 0 && (
          <div className={cn("px-1", isUser && "flex justify-end")}>
            <BubbleActions content={message.content} onRetry={onRetry} />
          </div>
        )}
      </div>
    </div>
  );
}

export const MessageBubble = memo(MessageBubbleImpl);
