"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

export default function ThemeSwitch({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const { t, format } = useI18n();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";
  const targetTheme = isDark ? t.errors.light : t.errors.dark;
  const label = format(t.errors.switchTo, { theme: targetTheme });

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={cn("text-muted-foreground hover:text-foreground", className)}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={mounted ? label : t.errors.toggleTheme}
      title={mounted ? label : t.errors.toggleTheme}
    >
      {/* Both icons render after mount to avoid a hydration mismatch, and the
          inactive one is hidden with opacity rather than unmounted so the
          button never changes size between themes. */}
      <Sun
        className={cn(
          "transition-all duration-200",
          mounted && isDark
            ? "scale-0 rotate-90 opacity-0"
            : "scale-100 rotate-0 opacity-100"
        )}
      />
      <Moon
        className={cn(
          "absolute transition-all duration-200",
          mounted && isDark
            ? "scale-100 rotate-0 opacity-100"
            : "scale-0 -rotate-90 opacity-0"
        )}
      />
    </Button>
  );
}