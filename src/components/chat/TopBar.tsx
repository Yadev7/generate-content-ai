"use client";

import { Download, LoaderCircle, Menu, PanelLeft, RotateCcw } from "lucide-react";

import AuthButtons from "@/components/chat/AuthButtons";
import LanguageSwitcher from "@/components/chat/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { PersonaCopy } from "@/lib/i18n/personas";

interface TopBarProps {
  activePersonaCopy?: PersonaCopy;
  onOpenSidebar: () => void;
  onExpandSidebar: () => void;
  sidebarHidden: boolean;
  onNewChat: () => void;
  onExport: () => void;
  canExport: boolean;
  isExporting: boolean;
}

export default function TopBar({
  activePersonaCopy,
  onOpenSidebar,
  onExpandSidebar,
  sidebarHidden,
  onNewChat,
  onExport,
  canExport,
  isExporting,
}: TopBarProps) {
  const { t } = useI18n();

  return (
    // `relative z-30` is required: `backdrop-blur` establishes a stacking
    // context, so without it the language menu's z-50 is trapped inside the
    // header and the scrolling content below paints over the dropdown.
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-3 ps-4 backdrop-blur-md sm:gap-3 sm:px-4">
      {/* Mobile drawer trigger, plus the desktop restore trigger when hidden. */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="shrink-0 text-muted-foreground lg:hidden"
        onClick={onOpenSidebar}
        aria-label={t.sidebar.open}
        title={t.sidebar.open}
      >
        <Menu className="size-[18px]" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className={`shrink-0 text-muted-foreground ${
          sidebarHidden ? "" : "hidden"
        }`}
        onClick={onExpandSidebar}
        aria-label={t.sidebar.expand}
        title={t.sidebar.expand}
      >
        <PanelLeft className="size-[18px]" />
      </Button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-sm font-semibold tracking-tight">
          {activePersonaCopy?.label ?? t.topbar.generalAssistant}
        </h1>
        <p className="truncate text-xs text-muted-foreground">
          {activePersonaCopy?.description ?? t.topbar.askAnything}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
        <AuthButtons />

        <span aria-hidden className="hidden h-5 w-px bg-border sm:block" />

        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          onClick={onExport}
          disabled={!canExport}
          title={canExport ? t.topbar.export : t.topbar.exportEmpty}
          aria-label={t.topbar.export}
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
          title={t.topbar.newConversation}
          aria-label={t.topbar.newConversation}
        >
          <RotateCcw className="size-4" />
        </Button>

        <LanguageSwitcher />
      </div>
    </header>
  );
}