import { SignUp } from "@clerk/nextjs";

import { clerkAppearance } from "@/lib/clerkAppearance";

export default function Page() {
  return (
    <SignUp
      routing="path"
      path="/sign-up"
      signInUrl="/sign-in"
      appearance={clerkAppearance}
    />
  );
}
