import type { PersonaId } from "../chat";
import type { LocaleCode } from "./locales";

export type { PersonaId };

export interface PersonaCopy {
  label: string;
  description: string;
  suggestion: string;
}

const en: Record<PersonaId, PersonaCopy> = {
  general: {
    label: "Study Desk",
    description: "Free revision help on any topic",
    suggestion:
      "Explain how to solve a quadratic equation, step by step.",
  },
  stem: {
    label: "STEM Tutor",
    description: "Socratic maths & physics — guided one step at a time",
    suggestion:
      "I'm stuck on integrating by parts. Can you show me the method and how to choose u and dv?",
  },
  language: {
    label: "Language & Literature Expert",
    description: "Close reading, language & analytical writing",
    suggestion:
      "Compare how the theme of isolation is developed in these two extracts, with quotes.",
  },
  humanities: {
    label: "Humanities Coach",
    description: "Essay structures & philosophical methods",
    suggestion:
      "Compare the causes of the French Revolution and the Russian Revolution, and which one historians debate most.",
  },
  quiz: {
    label: "General Exam Quiz Master",
    description: "Cross-subject practice, marking & weak-spot tracking",
    suggestion:
      "Give me a 10-minute quiz on quadratic equations and mark my answers with feedback.",
  },
  bonus: {
    label: "Sai Prime",
    description: "Unlimited exam prep with gap analysis",
    suggestion:
      "I have a Physics exam in a week. Analyse my weak spots and give me a day-by-day revision plan.",
  },
};

const fr: Record<PersonaId, PersonaCopy> = {
  general: {
    label: "Bureau d’étude",
    description: "Aide gratuite à la révision, tout sujet",
    suggestion:
      "Explique comment résoudre une équation du second degré, étape par étape.",
  },
  stem: {
    label: "Tuteur STEM",
    description: "Maths et physique à la manière socratique — une étape à la fois",
    suggestion:
      "Je bloque sur l’intégration par parties. Peux-tu montrer la méthode et comment choisir u et dv ?",
  },
  language: {
    label: "Expert en langue et littérature",
    description: "Lecture rapprochée, langue et écriture analytique",
    suggestion:
      "Compare le développement du thème de l’isolement dans ces deux extraits, avec des citations.",
  },
  humanities: {
    label: "Coach humanités",
    description: "Structures de dissertation et méthodes philosophiques",
    suggestion:
      "Compare les causes des révolutions française et russe, et dis-moi laquelle fait le plus débat parmi les historiens.",  },
  quiz: {
    label: "Maître général des examens",
    description: "Toutes matières : entraînement, correction et suivi des lacunes",
    suggestion:
      "Donne-moi un quiz de 10 minutes sur les équations du second degré et corrige mes réponses.",
  },
  bonus: {
    label: "Sai Prime",
    description: "Préparation illimitée avec analyse des lacunes",
    suggestion:
      "J’ai un examen de physique dans une semaine. Analyse mes points faibles et donne-moi un programme jour par jour.",
  },
};

const ar: Record<PersonaId, PersonaCopy> = {
  general: {
    label: "مكتب الدراسة",
    description: "مساعدة مجانية في المراجعة لأي موضوع",
    suggestion: "اشرح كيف تحل المعادلة من الدرجة الثانية خطوة بخطوة.",
  },
  stem: {
    label: "معلّم العلوم",
    description: "رياضيات وفيزياء بأسلوب سقراطي — خطوة بخطوة",
    suggestion:
      "أتعثر في التكامل بالأجزاء. هل يمكنك شرح الطريقة وكيف نختار u و dv؟",
  },
  language: {
    label: "خبير اللغة والأدب",
    description: "القراءة النقدية واللغة والكتابة التحليلية",
    suggestion:
      "قارن بين كيفية معالجة موضوع العزلة في هذين المقطفين، مع الاقتباسات.",
  },
  humanities: {
    label: "معلّم العلوم الإنسانية",
    description: "هياكل المقالات والمناهج الفلسفية",
    suggestion:
      "قارن بين أسباب الثورة الفرنسية والثورة الروسية، وأيهما أكثر جدلًا بين المؤرخين.",
  },
  quiz: {
    label: "معلّم الامتحانات العام",
    description: "تدريب شامل على جميع المواد مع التصحيح وتتبّع نقاط الضعف",
    suggestion:
      "أعطني اختبارًا من 10 دقائق عن المعادلات من الدرجة الثانية وصحّح إجاباتي.",
  },
  bonus: {
    label: "Sai Prime",
    description: "تحضير غير محدود مع تحليل نقاط الضعف",
    suggestion:
      "لدي امتحان في الفيزياء بعد أسبوع. حلّل نقاط ضعفي واعطني خطة مراجعة يومية.",
  },
};

/**
 * Locale-aware persona copy. `en` is the fallback, so an unknown locale or a
 * missing entry still renders readable text rather than a blank.
 */
const TABLES: Record<LocaleCode, Record<PersonaId, PersonaCopy>> = { en, fr, ar };

export function getPersonaCopy(locale: LocaleCode, id: PersonaId): PersonaCopy {
  return (TABLES[locale] ?? en)[id] ?? en[id];
}
