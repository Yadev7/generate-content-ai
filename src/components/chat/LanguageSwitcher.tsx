"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Languages } from "lucide-react";

import { useI18n } from "@/lib/i18n/I18nProvider";
import { LOCALES, type LocaleCode } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

export default function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click and on Escape so the menu behaves like a real menu.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const active = LOCALES.find((item) => item.code === locale) ?? LOCALES[0];

  const pick = (code: LocaleCode) => {
    setLocale(code);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.language}
        title={t.language}
        className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <Languages className="size-4" />
        <span className="hidden text-xs font-medium sm:inline">{active.label}</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t.language}
          className="absolute end-0 top-full z-50 mt-1.5 min-w-[10.5rem] animate-fade-in-up overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-panel"
        >
          {LOCALES.map((item) => (
            <button
              key={item.code}
              type="button"
              role="menuitemradio"
              aria-checked={item.code === locale}
              onClick={() => pick(item.code)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-start text-sm transition-colors",
                item.code === locale
                  ? "bg-secondary font-medium text-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <span className="flex-1 text-start">{item.label}</span>
              {item.code === locale && <Check className="size-3.5 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}