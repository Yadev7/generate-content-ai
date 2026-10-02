"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";

import { clerkLocalization } from "@/lib/clerkLocalization";
import { useI18n } from "@/lib/i18n/I18nProvider";

/**
 * `ClerkProvider` lives inside `I18nProvider` rather than in the root layout so
 * it can translate Clerk's own prebuilt sign-in / sign-up UI. The root layout is
 * a server component and cannot read the locale, which lives in localStorage.
 *
 * The locale is corrected on mount, so English renders for the first frame of a
 * French or Arabic visit and is then replaced; this is the same trade-off the
 * rest of the app makes.
 */
export function LocalizedClerkProvider({ children }: { children: ReactNode }) {
  const { locale } = useI18n();

  return <ClerkProvider localization={clerkLocalization(locale)}>{children}</ClerkProvider>;
}
