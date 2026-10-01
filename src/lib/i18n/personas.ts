import type { LocaleCode } from "./locales";

export type PersonaId =
  | "fitness"
  | "math"
  | "cooking"
  | "fullstack"
  | "audio"
  | "marketing";

export interface PersonaCopy {
  label: string;
  description: string;
  suggestion: string;
}

const en: Record<PersonaId, PersonaCopy> = {
  fitness: {
    label: "Fitness",
    description: "Training plans, form checks and nutrition",
    suggestion:
      "Design a 4-week beginner strength plan I can do at the gym 3x a week.",
  },
  math: {
    label: "Mathematics",
    description: "Step-by-step problem solving",
    suggestion: "Explain how to solve a quadratic equation, step by step.",
  },
  cooking: {
    label: "Cooking",
    description: "Recipes, technique and kitchen science",
    suggestion:
      "Give me a weeknight pasta recipe that takes under 30 minutes.",
  },
  fullstack: {
    label: "Full-stack",
    description: "Architecture, APIs and code review",
    suggestion:
      "How should I structure a Next.js app with an authenticated API layer?",
  },
  audio: {
    label: "Audio",
    description: "Production, mixing and acoustics",
    suggestion:
      "What does a basic signal chain look like for mixing a vocal?",
  },
  marketing: {
    label: "Marketing",
    description: "Positioning, growth and campaigns",
    suggestion:
      "Draft a go-to-market outline for a new B2B SaaS product.",
  },
};

const fr: Record<PersonaId, PersonaCopy> = {
  fitness: {
    label: "Fitness",
    description: "Programmes d’entraînement, technique et nutrition",
    suggestion:
      "Propose-moi un programme de musculation de 4 semaines pour débutant, 3 fois par semaine en salle.",
  },
  math: {
    label: "Mathématiques",
    description: "Résolution pas à pas",
    suggestion: "Explique comment résoudre une équation du second degré, étape par étape.",
  },
  cooking: {
    label: "Cuisine",
    description: "Recettes, technique et science",
    suggestion: "Donne-moi une recette de pâtes de semaine qui prend moins de 30 minutes.",
  },
  fullstack: {
    label: "Full-stack",
    description: "Architecture, API et revue de code",
    suggestion:
      "Comment structurer une application Next.js avec une couche API authentifiée ?",
  },
  audio: {
    label: "Audio",
    description: "Production, mixage et acoustique",
    suggestion: "À quoi ressemble une chaîne de traitement de base pour mixer une voix ?",
  },
  marketing: {
    label: "Marketing",
    description: "Positionnement, croissance et campagnes",
    suggestion:
      "Rédige un plan de mise sur le marché pour un nouveau produit SaaS B2B.",
  },
};

const ar: Record<PersonaId, PersonaCopy> = {
  fitness: {
    label: "اللياقة البدنية",
    description: "خطط تدريب وتصحيح الأداء والتغذية",
    suggestion:
      "صمّم لي خطة قوة للمبتدئين لمدة 4 أسابيع، 3 مرات أسبوعيًا في الصالة.",
  },
  math: {
    label: "الرياضيات",
    description: "حل المشكلات خطوة بخطوة",
    suggestion: "اشرح لي كيف أحل المعادلة التربيعية خطوة بخطوة.",
  },
cooking: {
    label: "الطبخ",
    description: "وصفات وتقنيات وعلوم المطبخ",
    suggestion: "أعطني وصفة معكرونة سريعة لأمسيات الأسبوع تُنجَز في أقل من 30 دقيقة.",
  },
  fullstack: {
    label: "تطوير متكامل",
    description: "البنية والواجهات ومراجعة الكود",
    suggestion: "كيف أصمّم تطبيق Next.js مع طبقة API محمية بتسجيل الدخول؟",
  },
  audio: {
    label: "الصوت",
    description: "الإنتاج والمزج والطبقات الصوتية",
    suggestion: "ما شكل سلسلة المعالجة الأساسية لمزج صوت بشري؟",
  },
  marketing: {
    label: "التسويق",
    description: "التموضع والنمو والحملات",
    suggestion: "اكتب مخطط إطلاق السوق لمنتج SaaS جديد موجّه للشركات.",
  },
};

const byLocale: Record<LocaleCode, Record<PersonaId, PersonaCopy>> = {
  en,
  fr,
  ar,
};

export function getPersonaCopy(
  locale: LocaleCode,
  id: PersonaId
): PersonaCopy {
  return byLocale[locale][id];
}