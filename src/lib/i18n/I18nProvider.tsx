"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  getDirection,
  isLocaleCode,
  type Direction,
  type LocaleCode,
} from "./locales";
import { dictionaries, interpolate, type Dictionary } from "./dictionaries";

interface I18nContextValue {
  locale: LocaleCode;
  dir: Direction;
  isRtl: boolean;
  setLocale: (locale: LocaleCode) => void;
  t: Dictionary;
  /** Interpolates `{name}` placeholders in a translated string. */
  format: (template: string, values?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // The server cannot know the stored locale, so start from the default and
  // correct on mount. Rendering the default first avoids a hydration mismatch.
  const [locale, setLocaleState] = useState<LocaleCode>(DEFAULT_LOCALE);

  useEffect(() => {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocaleCode(stored)) {
      setLocaleState(stored);
      return;
    }

    // No explicit choice yet: follow the browser preference when it matches a
    // supported language.
    const preferred = navigator.language.slice(0, 2).toLowerCase();
    if (isLocaleCode(preferred)) {
      setLocaleState(preferred);
    }
  }, []);

  const setLocale = useCallback((next: LocaleCode) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // Private mode or blocked storage; the choice just won't persist.
    }
  }, []);

  const dir = getDirection(locale);

  // Keep the document in sync so native form controls, text selection and
  // screen readers follow the active direction.
  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = dir;
  }, [locale, dir]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      dir,
      isRtl: dir === "rtl",
      setLocale,
      t: dictionaries[locale],
      format: interpolate,
    }),
    [locale, dir, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside <I18nProvider>");
  }
  return context;
}