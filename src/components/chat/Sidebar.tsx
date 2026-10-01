"use client";

import { MessageSquare, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import ThemeSwitch from "@/components/ThemeSwitch";
import { cn } from "@/lib/utils";
import type { Persona } from "@/lib/chat";

interface SidebarProps {
  personas: Persona[];
  activePersona: string;
  onSelectPersona: (value: string) => void;
  onNewChat: () => void;
  isOpen: boolean;
  onClose: () => void;
  hasMessages: boolean;
}

export default function Sidebar({
  personas,
  activePersona,
  onSelectPersona,
  onNewChat,
  isOpen,
  onClose,
  hasMessages,
}: SidebarProps) {
  return (
    <>
      {/* Scrim for the mobile drawer. */}
      <div
        onClick={onClose}
        aria-hidden
        className={cn(
          "fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity duration-200 lg:hidden",
          isOpen ? "animate-overlay-in opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      <aside
        aria-label="Chat settings"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[17rem] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 ease-out lg:static lg:z-auto lg:translate-x-0",
          isOpen ? "animate-drawer-in" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between px-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <MessageSquare className="size-4 text-sidebar-accent" />
            </div>
            <span className="truncate text-sm font-semibold tracking-tight">
              SAI Assistant
            </span>
          </div>

          <div className="flex items-center gap-0.5">
            <ThemeSwitch />
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground lg:hidden"
              onClick={onClose}
              aria-label="Close menu"
            >
              <X />
            </Button>
          </div>
        </div>

        <div className="px-3 pb-3">
          <Button
            onClick={onNewChat}
            disabled={!hasMessages}
            className="w-full justify-start gap-2.5 shadow-sm"
            title={hasMessages ? "Start a new conversation" : "No conversation to clear"}
          >
            <Plus className="size-4" />
            New conversation
          </Button>
        </div>

        <nav className="scrollbar-slim flex-1 overflow-y-auto px-3 pb-4">
          <p className="px-2 pb-2 pt-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
            Assistants
          </p>

          <ul className="space-y-0.5">
            {personas.map((persona) => {
              const isActive = persona.value === activePersona;
              const Icon = persona.icon;

              return (
                <li key={persona.value}>
                  <button
                    type="button"
                    onClick={() => onSelectPersona(persona.value)}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors",
                      isActive
                        ? "bg-sidebar-muted text-sidebar-foreground"
                        : "text-muted-foreground hover:bg-sidebar-muted/60 hover:text-sidebar-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors",
                        isActive
                          ? "border-sidebar-accent/30 bg-sidebar-accent/10 text-sidebar-accent"
                          : "bg-transparent text-muted-foreground group-hover:text-sidebar-foreground"
                      )}
                    >
                      <Icon className="size-4" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {persona.label}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {persona.description}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-sidebar-border px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Powered by a local LLM via LM Studio
          </p>
        </div>
      </aside>
    </>
  );
}
