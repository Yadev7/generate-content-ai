/**
 * Shared Clerk theming so sign-in and sign-up match the rest of the app.
 * Element keys are the ones Clerk exposes for the `appearance` prop.
 */
export const clerkAppearance = {
  elements: {
    cardBox: "w-full",
    card: "w-full shadow-none border border-border bg-card rounded-2xl",
    rootBox: "w-full max-w-none",
    headerTitle: "text-xl font-semibold tracking-tight text-foreground",
    headerSubtitle: "text-sm text-muted-foreground",
    formButtonPrimary:
      "h-10 w-full rounded-lg bg-primary text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90",
    socialButtonsBlockButton:
      "h-10 w-full rounded-lg border border-input text-sm font-medium transition-colors hover:bg-secondary",
    formFieldInput:
      "h-10 rounded-lg border-input bg-background text-sm shadow-sm transition-shadow focus:ring-2 focus:ring-ring",
    formFieldLabel: "text-sm font-medium text-foreground",
    formFieldInputPlaceholder: "text-muted-foreground",
    footerActionLink: "text-primary font-medium hover:underline",
    identityPreviewText: "text-sm",
  },
} as const;
