"use client";

import { MessageSquare, PanelLeftClose, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import ThemeSwitch from "@/components/ThemeSwitch";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { getPersonaCopy } from "@/lib/i18n/personas";
import type { Persona } from "@/lib/chat";
import { cn } from "@/lib/utils";

interface SidebarProps {
  personas: Persona[];
  activePersonaValue: string;
  onSelectPersona: (value: string) => void;
  onNewChat: () => void;
  onCollapse: () => void;
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  hasMessages: boolean;
}

export default function Sidebar({
  personas,
  activePersonaValue,
  onSelectPersona,
  onNewChat,
  onCollapse,
  isOpen,
  onClose,
  isCollapsed,
  hasMessages,
}: SidebarProps) {
  const { t, locale } = useI18n();

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
        aria-label={t.sidebar.assistants}
        className={cn(
          "fixed inset-y-0 start-0 z-40 flex w-[17rem] shrink-0 flex-col border-e border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 ease-out lg:static lg:z-auto lg:translate-x-0",
          // The off-canvas translate is scoped to `max-lg` so it cannot win
          // over `lg:translate-x-0` at desktop widths, which would slide the
          // panel out of view entirely (notably in RTL, where `rtl:` variants
          // are emitted after the plain ones).
          isOpen
            ? "ltr:animate-drawer-in rtl:animate-drawer-in-rtl"
            : "max-lg:ltr:-translate-x-full max-lg:rtl:translate-x-full",
          isCollapsed && "hidden lg:hidden"
        )}
      >
        <div className="flex h-14 items-center justify-between gap-1 px-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <MessageSquare className="size-4 text-sidebar-accent" />
            </div>
            <span className="truncate text-sm font-semibold tracking-tight">
              {t.brand.name}
            </span>
          </div>

          <div className="flex items-center gap-0.5">
            <ThemeSwitch />
            <Button
              variant="ghost"
              size="icon-sm"
              className="hidden text-muted-foreground lg:inline-flex"
              onClick={onCollapse}
              aria-label={t.sidebar.collapse}
              title={t.sidebar.collapse}
            >
              <PanelLeftClose className="size-4 rtl:-scale-x-100" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground lg:hidden"
              onClick={onClose}
              aria-label={t.sidebar.close}
              title={t.sidebar.close}
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
            title={hasMessages ? t.sidebar.newConversation : t.sidebar.newConversationEmpty}
          >
            <Plus className="size-4" />
            {t.sidebar.newConversation}
          </Button>
        </div>

        <nav className="scrollbar-slim flex-1 overflow-y-auto px-3 pb-4">
          <p className="px-2 pb-2 pt-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
            {t.sidebar.assistants}
          </p>

          <ul className="space-y-0.5">
            {personas.map((persona) => {
              const isActive = persona.value === activePersonaValue;
              const Icon = persona.icon;
              const copy = getPersonaCopy(locale, persona.id);

              return (
                <li key={persona.value}>
                  <button
                    type="button"
                    onClick={() => onSelectPersona(persona.value)}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-lg px-2 py-2 text-start transition-colors",
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
                        {copy.label}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {copy.description}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-sidebar-border px-4 py-3">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t.sidebar.poweredBy}
          </p>
        </div>
      </aside>
    </>
  );
}