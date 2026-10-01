"use client";

import { Download, LoaderCircle, Menu, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Persona } from "@/lib/chat";

interface TopBarProps {
  activePersona?: Persona;
  onOpenSidebar: () => void;
  onNewChat: () => void;
  onExport: () => void;
  canExport: boolean;
  isExporting: boolean;
}

export default function TopBar({
  activePersona,
  onOpenSidebar,
  onNewChat,
  onExport,
  canExport,
  isExporting,
}: TopBarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md">
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground lg:hidden"
        onClick={onOpenSidebar}
        aria-label="Open menu"
        aria-expanded={false}
      >
        <Menu className="size-[18px]" />
      </Button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-sm font-semibold tracking-tight">
          {activePersona ? activePersona.label : "General assistant"}
        </h1>
        <p className="truncate text-xs text-muted-foreground">
          {activePersona ? activePersona.description : "Ask anything"}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          onClick={onExport}
          disabled={!canExport}
          title={canExport ? "Export conversation as PDF" : "Nothing to export yet"}
          aria-label="Export conversation as PDF"
        >
          {isExporting ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          onClick={onNewChat}
          disabled={!canExport}
          title="Start a new conversation"
          aria-label="Start a new conversation"
        >
          <RotateCcw className="size-4" />
        </Button>
      </div>
    </header>
  );
}
