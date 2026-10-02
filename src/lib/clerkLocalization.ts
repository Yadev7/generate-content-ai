import type { LocaleCode } from "./i18n/locales";

/**
 * Translations for Clerk's prebuilt sign-in / sign-up components.
 *
 * Clerk does not read our locale, so these are passed to `ClerkProvider` as a
 * partial override of its English resource. Only the strings a visitor
 * actually sees on those two screens are covered; anything not listed falls
 * back to Clerk's English. A `data-localization-key` attribute on the element
 * reveals the key for anything that still needs adding.
 */
type Overrides = Record<string, unknown>;

const fr: Overrides = {
  formFieldLabel__emailAddress: "Adresse e-mail",
  formFieldLabel__password: "Mot de passe",
  formFieldLabel__firstName: "Prénom",
  formFieldLabel__lastName: "Nom",
  formFieldInputPlaceholder__emailAddress: "vous@exemple.com",
  formFieldInputPlaceholder__password: "Mot de passe",
  formFieldAction__forgotPassword: "Mot de passe oublié ?",
  formFieldError__notMatchingPasswords: "Les mots de passe ne correspondent pas.",
  formButtonPrimary: "Continuer",
  formButtonPrimary__verify: "Vérifier",
  backButton: "Retour",
  dividerText: "ou",
  footerPageLink__help: "Aide",
  footerPageLink__privacy: "Confidentialité",
  footerPageLink__terms: "Conditions",
  signIn: {
    start: {
      title: "Se connecter à SAI",
      subtitle: "Welcome back! Please enter your details below.",
      actionText: "Se connecter",
      actionLink: "S’inscrire",
    },
    password: {
      title: "Saisissez votre mot de passe",
      subtitle: "C’est votre mot de passe pour {email}",
      actionLink: "Mot de passe oublié ?",
    },
    forgotPassword: {
      title: "Réinitialiser le mot de passe",
      subtitle: "Entrez votre e-mail et nous vous enverrons un lien de réinitialisation.",
      formTitle: "Saisissez l’adresse e-mail associée à votre compte",
      resendButton: "Renvoyer le lien",
    },
  },
  signUp: {
    start: {
      title: "Créer votre compte",
      subtitle: "Bienvenue ! Renseignez vos informations pour continuer.",
      actionText: "S’inscrire",
      actionLink: "Se connecter",
    },
    emailCode: {
      title: "Vérifiez votre e-mail",
      subtitle: "Nous vous avons envoyé un code à {email}",
      formTitle: "Saisissez le code reçu",
      resendButton: "Renvoyer le code",
    },
  },
};

const ar: Overrides = {
  formFieldLabel__emailAddress: "البريد الإلكتروني",
  formFieldLabel__password: "كلمة المرور",
  formFieldLabel__firstName: "الاسم الأول",
  formFieldLabel__lastName: "اسم العائلة",
  formFieldInputPlaceholder__emailAddress: "you@example.com",
  formFieldInputPlaceholder__password: "كلمة المرور",
  formFieldAction__forgotPassword: "هل نسيت كلمة المرور؟",
  formFieldError__notMatchingPasswords: "كلمتا المرور غير متطابقتين.",
  formButtonPrimary: "متابعة",
  formButtonPrimary__verify: "تحقق",
  backButton: "رجوع",
  dividerText: "أو",
  footerPageLink__help: "المساعدة",
  footerPageLink__privacy: "الخصوصية",
  footerPageLink__terms: "الشروط",
  signIn: {
    start: {
      title: "تسجيل الدخول إلى SAI",
      subtitle: "مرحبًا بعودتك! أدخل بياناتك للمتابعة.",
      actionText: "تسجيل الدخول",
      actionLink: "إنشاء حساب",
    },
    password: {
      title: "أدخل كلمة المرور",
      subtitle: "هذه هي كلمة المرور الخاصة بـ {email}",
      actionLink: "هل نسيت كلمة المرور؟",
    },
    forgotPassword: {
      title: "إعادة تعيين كلمة المرور",
      subtitle: "أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين.",
      formTitle: "أدخل البريد الإلكتروني المرتبط بحسابك",
      resendButton: "إعادة إرسال الرابط",
    },
  },
  signUp: {
    start: {
      title: "إنشاء حساب",
      subtitle: "أهلًا بك! أدخل معلوماتك للمتابعة.",
      actionText: "إنشاء حساب",
      actionLink: "تسجيل الدخول",
    },
    emailCode: {
      title: "تحقق من بريدك الإلكتروني",
      subtitle: "أرسلنا رمزًا إلى {email}",
      formTitle: "أدخل الرمز الذي استلمته",
      resendButton: "إعادة إرسال الرمز",
    },
  },
};

const BY_LOCALE: Partial<Record<LocaleCode, Overrides>> = { fr, ar };

/** `localization` for `ClerkProvider`; undefined for English. */
export function clerkLocalization(
  locale: LocaleCode
): Overrides | undefined {
  return BY_LOCALE[locale];
}
