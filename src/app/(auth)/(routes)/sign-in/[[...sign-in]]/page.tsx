import { SignIn } from "@clerk/nextjs";

import { clerkAppearance } from "@/lib/clerkAppearance";

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
