import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import hr from "./locales/hr.json";

// Language names are always shown in their own language.
export const LANGUAGES = [
    { code: "hr", label: "Hrvatski" },
    { code: "en", label: "English" },
];

// Keep <html lang> in sync (screen readers, spellcheck, browser translate).
i18n.on("languageChanged", () => {
    document.documentElement.lang = i18n.resolvedLanguage;
});

i18n.use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            hr: { translation: hr },
        },
        supportedLngs: LANGUAGES.map((language) => language.code),
        nonExplicitSupportedLngs: true, // "en-US" -> en, "hr-HR" -> hr
        fallbackLng: "en", // browser language we don't support
        detection: {
            // A language picked in the switcher wins; otherwise use the
            // browser's language. The choice is remembered in localStorage.
            order: ["localStorage", "navigator"],
            caches: ["localStorage"],
            lookupLocalStorage: "language",
        },
        interpolation: { escapeValue: false }, // React already escapes
        // Translations are bundled, so set up synchronously before the
        // first render instead of suspending.
        initAsync: false,
    });

export default i18n;
