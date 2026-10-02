import { SignIn } from "@clerk/nextjs";

import { clerkAppearance } from "@/lib/clerkAppearance";

// Clerk's own copy is translated through `localization` on `ClerkProvider`
// (see `src/lib/clerkLocalization.ts`); v6 has no per-component `locale` prop.
export default function Page() {
  return (
    <SignIn
      routing="path"
      path="/sign-in"
      signUpUrl="/sign-up"
      appearance={clerkAppearance}
    />
  );
}
