"use client";

import {
  ArrowRight,
  Award,
  BookOpen,
  Check,
  Clock,
  Globe,
  Infinity,
  ListChecks,
  MessageSquare,
  School,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { FREEMIUM_FEATURES, PRIME_HIGHLIGHTS } from "@/lib/freemium";

export default function HomePage() {
  const prices = [
    {
      id: "monthly",
      name: "Sai Prime – Monthly",
      price: "$5",
      interval: "per month",
      description: "Perfect for exam season or a short revision burst.",
      features: ["Full access to all tutors", "Unlimited revision", "Cancel anytime"],
    },
    {
      id: "yearly",
      name: "Sai Prime – Yearly",
      price: "$15",
      interval: "per year",
      description: "Best value: 2 months free vs. monthly. Ideal for the full school year.",
      features: [
        "Full access to all tutors",
        "Unlimited revision",
        "2 months free vs. monthly",
        "Cancel anytime",
      ],
    },
  ];

  const features = [
    {
      icon: Zap,
      title: "Explains, never just tells",
      body: "Get step-by-step solutions with working shown, not just the final answer.",
    },
    {
      icon: BookOpen,
      title: "Built for school revision",
      body: "Covers Maths, Physics, Languages, Literature, Philosophy and History at secondary level.",
    },
    {
      icon: ListChecks,
      title: "Finds knowledge gaps",
      body: "The General Exam Quiz Master marks answers against mark-scheme style feedback and re-tests weak areas.",
    },
    {
      icon: ShieldCheck,
      title: "Safe & local-first",
      body: "Runs via LM Studio locally where configured, with server-only prompts and strict access control.",
    },
  ];

  const tutors = [
    {
      title: "Study Desk (Free, no sign-in)",
      subtitle: "General revision help for any topic. Perfect for a quick question.",
      icon: MessageSquare,
      free: "15 messages/day",
    },
    {
      title: "STEM Tutor (Free, sign-in)",
      subtitle: "Maths & Physics – Socratic questioning, formulas formatted cleanly, misconceptions named.",
      icon: Zap,
      free: "15 messages/day",
    },
    {
      title: "Language & Literature Expert (Free, sign-in)",
      subtitle: "Close reading, literary technique, language accuracy and analytical writing.",
      icon: Globe,
      free: "15 messages/day",
    },
    {
      title: "Humanities Coach (Sai Prime)",
      subtitle: "Essay structures for every task type, plus named philosophical methodologies.",
      icon: School,
      free: "Locked",
    },
    {
      title: "General Exam Quiz Master (Sai Prime)",
      subtitle: "Cross-subject exam practice, mark-scheme marking, weak-topic tracking, spaced re-testing.",
      icon: Award,
      free: "Locked",
    },
  ];

  return (
    <div className="relative flex min-h-dvh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 rounded-md text-sm font-semibold tracking-tight">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary/10">
              <Sparkles className="size-4 text-primary" />
            </span>
            SaiGPT
          </Link>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/chat">Open Chat</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/chat">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden border-b bg-gradient-to-b from-background via-background to-muted/40">
          <div className="pointer-events-none absolute -top-24 right-0 h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 left-0 h-[24rem] w-[24rem] rounded-full bg-primary/5 blur-3xl" />

          <div className="relative mx-auto flex w-full max-w-7xl flex-col items-center px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8">
            <div className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs shadow-sm">
              <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                <Clock className="size-3.5" />
                Built for exam revision
              </span>
              <span className="px-1 text-muted-foreground">Students &amp; parents</span>
            </div>

            <h1 className="mt-6 max-w-4xl text-3xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              SaiGPT – Study smarter. Revise faster. Get exam-ready.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg">
              Ai-powered revision that actually teaches. SaiGPT gives step-by-step explanations, marks your answers like an examiner, and focuses on your weak spots — not just the answer.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:mt-10">
              <Button size="lg" asChild>
                <Link href="/chat">
                  Start revising for free
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="#compare">See Free vs Sai Prime</Link>
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground sm:mt-10">
              <div className="flex items-center gap-1.5">
                <Check className="size-4 text-primary" />
                No sign-up required to try Study Desk
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="size-4 text-primary" />
                Student-first, parent-friendly
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="size-4 text-primary" />
                Cancel anytime with Sai Prime
              </div>
            </div>
          </div>
        </section>

        <section className="border-b bg-background">
          <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Purpose-built for school exams</h2>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
                SaiGPT moves beyond generic chat. Every tutor is designed to teach the way examiners expect.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className="group flex flex-col rounded-2xl border bg-card p-5 shadow-sm transition-all duration-150 hover:border-primary/40 hover:shadow-raised"
                  >
                    <div className="flex size-10 items-center justify-center rounded-xl border bg-background">
                      <Icon className="size-5 text-primary" />
                    </div>
                    <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-b bg-muted/40">
          <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Specialist tutors, exactly when you need them</h2>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
                Start free with Study Desk, unlock more with a free sign-in, or go unlimited with Sai Prime for the hardest revision.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3">
              {tutors.map((tutor) => {
                const Icon = tutor.icon;
                return (
                  <div key={tutor.title} className="flex flex-col rounded-2xl border bg-card p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-background">
                        <Icon className="size-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold">{tutor.title}</h3>
                        <p className="text-xs text-muted-foreground">{tutor.free}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{tutor.subtitle}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex justify-center">
              <Button size="lg" asChild>
                <Link href="/chat">
                  Try the tutors now
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section id="compare" className="border-b bg-background">
          <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Free vs Sai Prime</h2>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
                Clear, honest limits. No surprise paywalls. Perfect for students and parents.
              </p>
            </div>

            <div className="mt-8 overflow-hidden rounded-2xl border shadow-sm sm:mt-10">
              <div className="grid grid-cols-3 bg-muted/50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:px-6">
                <div>Feature</div>
                <div className="text-center">Free</div>
                <div className="text-center">Sai Prime</div>
              </div>
              <div className="divide-y">
                {FREEMIUM_FEATURES.map((row) => (
                  <div
                    key={row.label}
                    className="grid grid-cols-3 items-center gap-2 px-4 py-3 text-sm sm:px-6"
                  >
                    <div>
                      <div className="font-medium">{row.label}</div>
                      <div className="text-xs text-muted-foreground">{row.description}</div>
                    </div>
                    <div className="text-center text-muted-foreground">{row.free}</div>
                    <div className="text-center font-medium text-primary">{row.prime}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {PRIME_HIGHLIGHTS.map((h) => (
                <div key={h} className="flex items-start gap-2 rounded-lg border bg-card px-3 py-2 text-sm shadow-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="leading-relaxed">{h}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-muted/40">
          <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <div className="mx-auto max-w-4xl text-center">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Simple, student-friendly pricing
              </h2>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
                Get unlimited access to every tutor for less than a cup of coffee per month.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 lg:mx-auto lg:max-w-4xl">
              {prices.map((p) => (
                <div
                  key={p.id}
                  className="relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm ring-1 ring-primary/10"
                >
                  {p.id === "yearly" && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground shadow-sm">
                      Best value
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold">{p.name}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
                  </div>
                  <div className="mt-5 flex items-end gap-1">
                    <span className="text-4xl font-bold tracking-tight">{p.price}</span>
                    <span className="mb-1 text-sm text-muted-foreground">{p.interval}</span>
                  </div>
                  <ul className="mt-5 space-y-2">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <Check className="size-4 text-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 flex flex-1 items-end">
                    <Button size="lg" className="w-full" asChild>
                      <Link href="/chat">Start with Sai Prime</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Infinity className="size-4" />
                Unlimited revision with Prime
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="size-4" />
                Parent-approved, distraction-free
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="size-4" />
                Cancel anytime, no lock-in
              </div>
            </div>
          </div>
        </section>

        <section className="border-t bg-background">
          <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Ready to get exam-ready?
              </h2>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
                Start with a free question in Study Desk, or dive straight into your weakest topic.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button size="lg" asChild>
                  <Link href="/chat">
                    Open SaiGPT Chat
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link href="#compare">Compare Free vs Prime</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-muted/30">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 text-center text-sm text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} SaiGPT. Built for students, trusted by parents.</p>
          <div className="flex items-center gap-4">
            <Link href="/chat" className="hover:text-foreground">
              Chat
            </Link>
            <Link href="#compare" className="hover:text-foreground">
              Pricing
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
