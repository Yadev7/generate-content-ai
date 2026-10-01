export const LOCALES = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "fr", label: "Français", dir: "ltr" },
  { code: "ar", label: "العربية", dir: "rtl" },
] as const;

export type LocaleCode = (typeof LOCALES)[number]["code"];
export type Direction = (typeof LOCALES)[number]["dir"];

export const DEFAULT_LOCALE: LocaleCode = "en";

export const LOCALE_STORAGE_KEY = "sai-locale";

export function isLocaleCode(value: unknown): value is LocaleCode {
  return LOCALES.some((locale) => locale.code === value);
}

export function getDirection(locale: LocaleCode): Direction {
  return LOCALES.find((item) => item.code === locale)?.dir ?? "ltr";
}

/** Maps a UI locale onto the matching BCP-47 tag for speech recognition. */
export function getSpeechLocale(locale: LocaleCode): string {
  switch (locale) {
    case "fr":
      return "fr-FR";
    case "ar":
      return "ar-AE";
    default:
      return "en-US";
  }
}