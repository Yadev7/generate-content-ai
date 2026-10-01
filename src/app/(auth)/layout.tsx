import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import ThemeSwitch from "@/components/ThemeSwitch";

const AuthLayout = ({ children }: { children: ReactNode }) => {
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
            SAI Assistant
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
              One workspace. Six specialised assistants. Answers grounded in a
              model you control.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Switch between fitness, mathematics, cooking, engineering, audio
              and marketing personas without losing your conversation.
            </p>
          </blockquote>

          <ul className="mt-10 grid grid-cols-2 gap-3">
            {[
              "Local inference",
              "Voice input",
              "Markdown & code",
              "PDF export",
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
