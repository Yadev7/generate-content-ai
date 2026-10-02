"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import ThemeSwitch from "@/components/ThemeSwitch";
import { useI18n } from "@/lib/i18n/I18nProvider";

// Client so the marketing copy and the brand name follow the visitor's chosen
// locale, which lives in localStorage and so is not visible on the server.
const AuthLayout = ({ children }: { children: ReactNode }) => {
  const { t } = useI18n();

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Form panel */}
      <div className="relative flex flex-col px-6 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-md text-sm font-semibold tracking-tight"
          >
            <Image
              src="/logo.png"
              alt=""
              width={28}
              height={28}
              className="size-7 rounded-md object-cover"
            />
            {t.brand.name}
          </Link>
          <ThemeSwitch />
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>

      {/* Brand panel */}
      <div className="relative hidden overflow-hidden border-l bg-sidebar lg:block">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-[28rem] rounded-full bg-primary/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-16 size-[24rem] rounded-full bg-primary/10 blur-3xl"
        />

        <div className="relative flex h-full flex-col justify-center px-14">
          <blockquote className="max-w-md">
            <p className="text-2xl font-semibold leading-snug tracking-tight">
              {t.authPage.headline}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {t.authPage.subhead}
            </p>
          </blockquote>

          <ul className="mt-10 grid grid-cols-2 gap-3">
            {[
              t.authPage.features.local,
              t.authPage.features.voice,
              t.authPage.features.markdown,
              t.authPage.features.pdf,
            ].map((feature) => (
              <li
                key={feature}
                className="rounded-lg border border-sidebar-border bg-card/60 px-3.5 py-3 text-sm text-muted-foreground backdrop-blur-sm"
              >
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
