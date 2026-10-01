import type { LocaleCode } from "./locales";

/**
 * Every user-facing string in the app lives here. `en` is the source of truth
 * and defines the shape: the other locales must satisfy the same type, so a
 * missing or misspelled key is a compile error rather than a runtime blank.
 *
 * `en` is deliberately NOT `as const` — that would pin each value to its
 * English literal and make every translation a type error. Values stay `string`
 * while the key structure stays exactly enforced.
 */
const en = {
  language: "Language",
  brand: {
    name: "SAI Assistant",
    tagline: "Ask SAI-GPT",
  },
  auth: {
    signIn: "Sign in",
    signUp: "Sign up",
    signOut: "Sign out",
    account: "Account",
    myAccount: "My account",
    signOutTooltip: "Sign out",
  },
  sidebar: {
    assistants: "Assistants",
    newConversation: "New conversation",
    newConversationEmpty: "No conversation to clear",
    collapse: "Collapse sidebar",
    expand: "Show sidebar",
    close: "Close menu",
    open: "Open menu",
    poweredBy: "Powered by a local LLM via LM Studio",
    selectHint: "Pick a persona to specialise the assistant.",
  },
  topbar: {
    generalAssistant: "General assistant",
    askAnything: "Ask anything",
    export: "Export conversation as PDF",
    exportEmpty: "Nothing to export yet",
    exporting: "Preparing your PDF…",
    newConversation: "Start a new conversation",
  },
  composer: {
    label: "Message",
    placeholder: "Ask SAI-GPT",
    send: "Send message",
    sendTitle: "Send message (Enter)",
    voiceStart: "Start dictation",
    voiceStop: "Stop dictation",
    voiceLanguage: "Voice language",
    hintSend: "to send",
    hintNewline: "for a new line",
    sendAria: "Send message",
  },
  empty: {
    greeting: "How can I help you today?",
    subtitle:
      "Choose an assistant from the sidebar or jump straight in with one of these.",
    personaGreeting: "assistant",
    fallbackSuggestions: [
      "Explain the difference between a process and a thread.",
      "Write a TypeScript function that debounces an async callback.",
      "Give me a 15-minute stretching routine for lower back stiffness.",
    ],
  },
  message: {
    you: "You",
    assistant: "SAI",
    copy: "Copy",
    copyMessage: "Copy message",
    copied: "Copied",
    copiedMessage: "Message copied",
    copyCode: "Copy code",
    copiedCode: "Code copied",
    regenerate: "Regenerate response",
    somethingWentWrong: "Something went wrong",
  },
  status: {
    thinking: "SAI is thinking",
    requestFailed: "Request failed",
    retry: "Retry",
    dismiss: "Dismiss",
  },
  errors: {
    emptyResponse: "The model returned an empty response.",
    microphoneDenied: "Microphone access was denied.",
    dictationFailed: "Dictation failed.",
    pdfFailed: "Could not generate the PDF. Please try again.",
    toggleTheme: "Toggle theme",
    switchTo: "Switch to {theme} mode",
    light: "light",
    dark: "dark",
  },
};

export type Dictionary = typeof en;

export const dictionaries: Record<LocaleCode, Dictionary> = {
  en,
  fr: {
    language: "Langue",
    brand: {
      name: "Assistant SAI",
      tagline: "Ask SAI-GPT",
    },
    auth: {
      signIn: "Se connecter",
      signUp: "S’inscrire",
      signOut: "Se déconnecter",
      account: "Compte",
      myAccount: "Mon compte",
      signOutTooltip: "Se déconnecter",
    },
    sidebar: {
      assistants: "Assistants",
      newConversation: "Nouvelle conversation",
      newConversationEmpty: "Aucune conversation à effacer",
      collapse: "Réduire la barre latérale",
      expand: "Afficher la barre latérale",
      close: "Fermer le menu",
      open: "Ouvrir le menu",
      poweredBy: "Propulsé par un LLM local via LM Studio",
      selectHint: "Choisissez un assistant pour spécialiser les réponses.",
    },
    topbar: {
      generalAssistant: "Assistant général",
      askAnything: "Posez votre question",
      export: "Exporter la conversation en PDF",
      exportEmpty: "Rien à exporter pour l’instant",
      exporting: "Préparation du PDF…",
      newConversation: "Démarrer une nouvelle conversation",
    },
    composer: {
      label: "Message",
      placeholder: "Ask SAI-GPT",
      send: "Envoyer le message",
      sendTitle: "Envoyer (Entrée)",
      voiceStart: "Commencer la dictée",
      voiceStop: "Arrêter la dictée",
      voiceLanguage: "Langue de la dictée",
      hintSend: "pour envoyer",
      hintNewline: "pour une nouvelle ligne",
      sendAria: "Envoyer le message",
    },
    empty: {
      greeting: "Comment puis-je vous aider ?",
      subtitle:
        "Choisissez un assistant dans la barre latérale ou commencez directement avec l’une de ces suggestions.",
      personaGreeting: "assistant",
      fallbackSuggestions: [
        "Expliquez la différence entre un processus et un thread.",
        "Écrivez une fonction TypeScript qui débounce un callback asynchrone.",
        "Proposez-moi 15 minutes d’étirements pour un bas du dos raide.",
      ],
    },
    message: {
      you: "Vous",
      assistant: "SAI",
      copy: "Copier",
      copyMessage: "Copier le message",
      copied: "Copié",
      copiedMessage: "Message copié",
      copyCode: "Copier le code",
      copiedCode: "Code copié",
      regenerate: "Régénérer la réponse",
      somethingWentWrong: "Une erreur est survenue",
    },
    status: {
      thinking: "SAI réfléchit",
      requestFailed: "La requête a échoué",
      retry: "Réessayer",
      dismiss: "Fermer",
    },
    errors: {
      emptyResponse: "Le modèle a renvoyé une réponse vide.",
      microphoneDenied: "L’accès au microphone a été refusé.",
      dictationFailed: "La dictée a échoué.",
      pdfFailed: "Impossible de générer le PDF. Veuillez réessayer.",
      toggleTheme: "Changer de thème",
      switchTo: "Passer en mode {theme}",
      light: "clair",
      dark: "sombre",
    },
  },
  ar: {
    language: "اللغة",
    brand: {
      name: "مساعد SAI",
      tagline: "اسأل SAI-GPT",
    },
    auth: {
      signIn: "تسجيل الدخول",
      signUp: "إنشاء حساب",
      signOut: "تسجيل الخروج",
      account: "الحساب",
      myAccount: "حسابي",
      signOutTooltip: "تسجيل الخروج",
    },
    sidebar: {
      assistants: "المساعدون",
      newConversation: "محادثة جديدة",
      newConversationEmpty: "لا توجد محادثة لمسحها",
      collapse: "طيّ الشريط الجانبي",
      expand: "إظهار الشريط الجانبي",
      close: "إغلاق القائمة",
      open: "فتح القائمة",
      poweredBy: "مدعوم بنموذج لغوي محلي عبر LM Studio",
      selectHint: "اختر مساعدًا لتخصيص إجاباته.",
    },
    topbar: {
      generalAssistant: "مساعد عام",
      askAnything: "اسأل أي شيء",
      export: "تصدير المحادثة إلى PDF",
      exportEmpty: "لا يوجد شيء لتصديره بعد",
      exporting: "جارٍ تجهيز ملف PDF…",
      newConversation: "بدء محادثة جديدة",
    },
    composer: {
      label: "الرسالة",
      placeholder: "Ask SAI-GPT",
      send: "إرسال الرسالة",
      sendTitle: "إرسال (Enter)",
      voiceStart: "بدء الإدخال الصوتي",
      voiceStop: "إيقاف الإدخال الصوتي",
      voiceLanguage: "لغة الإدخال الصوتي",
      hintSend: "للإرسال",
      hintNewline: "لسطر جديد",
      sendAria: "إرسال الرسالة",
    },
    empty: {
      greeting: "كيف يمكنني مساعدتك؟",
      subtitle: "اختر مساعدًا من الشريط الجانبي أو ابدأ مباشرةً بأحد هذه الاقتراحات.",
      personaGreeting: "مساعد",
      fallbackSuggestions: [
        "اشرح الفرق بين العملية والخيط.",
        "اكتب دالة TypeScript تؤخر تنفيذ استدعاء غير متزامن.",
        "اقترح عليّ 15 دقيقة من تمارين الإطالة لآلام أسفل الظهر.",
      ],
    },
    message: {
      you: "أنت",
      assistant: "SAI",
      copy: "نسخ",
      copyMessage: "نسخ الرسالة",
      copied: "تم النسخ",
      copiedMessage: "تم نسخ الرسالة",
      copyCode: "نسخ الكود",
      copiedCode: "تم نسخ الكود",
      regenerate: "إعادة توليد الرد",
      somethingWentWrong: "حدث خطأ ما",
    },
    status: {
      thinking: "SAI يفكّر",
      requestFailed: "فشل الطلب",
      retry: "إعادة المحاولة",
      dismiss: "إغلاق",
    },
    errors: {
      emptyResponse: "أعاد النموذج ردًا فارغًا.",
      microphoneDenied: "تم رفض الوصول إلى الميكروفون.",
      dictationFailed: "فشل الإدخال الصوتي.",
      pdfFailed: "تعذّر إنشاء ملف PDF. يرجى المحاولة مرة أخرى.",
      toggleTheme: "تبديل المظهر",
      switchTo: "التبديل إلى الوضع {theme}",
      light: "الفاتح",
      dark: "الداكن",
    },
  },
};

/** Simple `{placeholder}` interpolation. */
export function interpolate(
  template: string,
  values: Record<string, string | number> = {}
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in values ? String(values[key]) : match
  );
}