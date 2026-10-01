"use client";

import Image from "next/image";
import { ArrowUp } from "lucide-react";

import type { Persona } from "@/lib/chat";

interface EmptyStateProps {
  activePersona?: Persona;
  onPickSuggestion: (text: string) => void;
}

export default function EmptyState({ activePersona, onPickSuggestion }: EmptyStateProps) {
  const suggestions = activePersona
    ? [activePersona.suggestion]
    : [
        "Explain the difference between a process and a thread.",
        "Write a TypeScript function that debounces an async callback.",
        "Give me a 15-minute stretching routine for lower back stiffness.",
      ];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="flex size-14 items-center justify-center overflow-hidden rounded-2xl border bg-card shadow-raised">
        <Image src="/logo.png" alt="" width={56} height={56} className="size-14 object-cover" />
      </div>

      <h1 className="mt-5 text-center text-2xl font-semibold tracking-tight">
        {activePersona ? `${activePersona.label} assistant` : "How can I help you today?"}
      </h1>
      <p className="mt-2 max-w-md text-center text-sm leading-relaxed text-muted-foreground">
        {activePersona
          ? activePersona.description
          : "Choose an assistant from the sidebar or jump straight in with one of these."}
      </p>

      <div className="mt-7 grid w-full gap-2.5 sm:grid-cols-1">
        {suggestions.map((text) => (
          <button
            key={text}
            type="button"
            onClick={() => onPickSuggestion(text)}
            className="group flex w-full items-center gap-3 rounded-xl border bg-card p-3.5 text-left text-sm shadow-subtle transition-all duration-150 hover:border-primary/40 hover:bg-accent/5 hover:shadow-raised"
          >
            <span className="flex-1 leading-relaxed">{text}</span>
            <ArrowUp className="size-4 shrink-0 -rotate-45 text-muted-foreground transition-all duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
          </button>
        ))}
      </div>
    </div>
  );
}
