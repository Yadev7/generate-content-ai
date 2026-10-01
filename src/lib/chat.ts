import type { LucideIcon } from "lucide-react";
import {
  Calculator,
  CodeXml,
  Dumbbell,
  Megaphone,
  Music4,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";

export type MessageRole = "user" | "bot";

export type MessageStatus = "streaming" | "complete" | "error";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
}

export interface Persona {
  /** System prompt sent to the model for this persona. */
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Shown on the welcome screen as a one-tap starter prompt. */
  suggestion: string;
}

export const DEFAULT_PERSONA_VALUE = "Act as a general helpful assistant.";

export const personas: Persona[] = [
  {
    value: "Chatbot react now as Fitness Expert",
    label: "Fitness",
    description: "Training plans, form checks and nutrition",
    icon: Dumbbell,
    suggestion: "Design a 4-week beginner strength plan I can do at the gym 3x a week.",
  },
  {
    value: "Chatbot react now as Math Expert",
    label: "Mathematics",
    description: "Step-by-step problem solving",
    icon: Calculator,
    suggestion: "Explain how to solve a quadratic equation, step by step.",
  },
  {
    value: "Chatbot react now as Cooking Expert",
    label: "Cooking",
    description: "Recipes, technique and kitchen science",
    icon: UtensilsCrossed,
    suggestion: "Give me a weeknight pasta recipe that takes under 30 minutes.",
  },
  {
    value: "Chatbot react now as Fullstack Expert",
    label: "Full-stack",
    description: "Architecture, APIs and code review",
    icon: CodeXml,
    suggestion: "How should I structure a Next.js app with an authenticated API layer?",
  },
  {
    value: "Chatbot react now as Audio Expert",
    label: "Audio",
    description: "Production, mixing and acoustics",
    icon: Music4,
    suggestion: "What does a basic signal chain look like for mixing a vocal?",
  },
  {
    value: "Chatbot react now as Digital Marketing Expert",
    label: "Marketing",
    description: "Positioning, growth and campaigns",
    icon: Megaphone,
    suggestion: "Draft a go-to-market outline for a new B2B SaaS product.",
  },
];

export const languages = [
  { value: "en-US", label: "English" },
  { value: "fr-FR", label: "French" },
  { value: "es-ES", label: "Spanish" },
  { value: "ja-JP", label: "Japanese" },
  { value: "ar-AE", label: "Arabic" },
] as const;

export const SUGGESTION_ICONS = { Sparkles } as const;
