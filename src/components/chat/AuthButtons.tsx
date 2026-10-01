"use client";

import { SignedIn, SignedOut, useClerk, useUser } from "@clerk/nextjs";
import { LogIn, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/I18nProvider";

/**
 * Header auth controls. `SignedIn`/`SignedOut` gate the two states so Clerk's
 * session state drives the UI, and `openSignIn`/`openSignUp` mount the hosted
 * components as modals so the user never leaves the app.
 */
export default function AuthButtons() {
  return (
    <>
      <SignedOut>
        <SignedOutButtons />
      </SignedOut>
      <SignedIn>
        <SignedInButtons />
      </SignedIn>
    </>
  );
}

function SignedOutButtons() {
  const { openSignIn, openSignUp } = useClerk();
  const { t } = useI18n();

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => openSignIn()}
        aria-label={t.auth.signIn}
      >
        <LogIn className="size-4" />
        <span className="hidden sm:inline">{t.auth.signIn}</span>
      </Button>
      <Button size="sm" onClick={() => openSignUp()} aria-label={t.auth.signUp}>
        <UserPlus className="size-4" />
        <span className="hidden sm:inline">{t.auth.signUp}</span>
      </Button>
    </div>
  );
}

function SignedInButtons() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const { t } = useI18n();

  if (!user) return null;

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <span
        className="hidden max-w-[9rem] truncate text-sm text-muted-foreground md:inline"
        title={user.primaryEmailAddress?.emailAddress ?? undefined}
      >
        {user.firstName ?? user.primaryEmailAddress?.emailAddress ?? t.auth.myAccount}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => signOut()}
        aria-label={t.auth.signOut}
      >
        {t.auth.signOut}
      </Button>
    </div>
  );
}