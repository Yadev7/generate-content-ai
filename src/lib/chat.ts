import type { LucideIcon } from "lucide-react";
import {
  Calculator,
  CodeXml,
  Dumbbell,
  Megaphone,
  Music4,
  UtensilsCrossed,
} from "lucide-react";

import type { PersonaId } from "./i18n/personas";

export type MessageRole = "user" | "bot";

export type MessageStatus = "streaming" | "complete" | "error";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
}

export interface Persona {
  id: PersonaId;
  /**
   * System prompt sent to the model. Deliberately English-only: this is model
   * input, not UI copy, so it is not localised.
   */
  value: string;
  icon: LucideIcon;
}

export const DEFAULT_PERSONA_VALUE = "Act as a general helpful assistant.";

export const personas: Persona[] = [
  {
    id: "fitness",
    value: "Chatbot react now as Fitness Expert",
    icon: Dumbbell,
  },
  {
    id: "math",
    value: "Chatbot react now as Math Expert",
    icon: Calculator,
  },
  {
    id: "cooking",
    value: "Chatbot react now as Cooking Expert",
    icon: UtensilsCrossed,
  },
  {
    id: "fullstack",
    value: "Chatbot react now as Fullstack Expert",
    icon: CodeXml,
  },
  {
    id: "audio",
    value: "Chatbot react now as Audio Expert",
    icon: Music4,
  },
  {
    id: "marketing",
    value: "Chatbot react now as Digital Marketing Expert",
    icon: Megaphone,
  },
];

export function personaIdForValue(value: string): PersonaId | undefined {
  return personas.find((persona) => persona.value === value)?.id;
}

export const languages = [
  { value: "en-US", label: "English" },
  { value: "fr-FR", label: "Français" },
  { value: "es-ES", label: "Español" },
  { value: "ja-JP", label: "日本語" },
  { value: "ar-AE", label: "العربية" },
] as const;