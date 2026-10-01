"use client";

import { cn } from "@/lib/utils";

/** Three-bar equalizer used while waiting on the model. */
export function TypingIndicator({ label = "SAI is thinking" }: { label?: string }) {
  return (
    <div
      className="flex w-full animate-fade-in-up items-center gap-3"
      role="status"
      aria-live="polite"
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-tl-sm border bg-card" aria-hidden>
        <div className="flex items-end gap-[3px]">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-3 w-[3px] animate-bar-bounce rounded-full bg-muted-foreground"
              style={{ animationDelay: `${i * 0.14}s` }}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2.5 rounded-2xl rounded-tl-sm border bg-card px-4 py-3.5 shadow-subtle">
        <span className="sr-only">{label}</span>
        <div className="flex items-center gap-1.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-1.5 animate-bar-bounce rounded-full bg-muted-foreground"
              style={{ animationDelay: `${i * 0.14}s` }}
            />
          ))}
        </div>
        <span className="text-sm text-muted-foreground" aria-hidden>
          {label}
        </span>
      </div>
    </div>
  );
}

export function ErrorBanner({
  message,
  onRetry,
  onDismiss,
  className,
}: {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex animate-fade-in items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3.5",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-destructive">Request failed</p>
        <p className="mt-0.5 break-words text-sm text-muted-foreground">{message}</p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md px-2 py-1 text-sm font-medium text-primary transition-colors hover:bg-destructive/10"
          >
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
