import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./locales/en";
import { ar } from "./locales/ar";

const saved = localStorage.getItem("hqms_lang");
const lng = saved || (navigator.language?.toLowerCase().startsWith("ar") ? "ar" : "en");

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar } },
  lng,
  fallbackLng: "en",
  interpolation: { escapeValue: false }
});

export function applyDirection(language) {
  const isRtl = language === "ar";
  document.documentElement.dir = isRtl ? "rtl" : "ltr";
  document.documentElement.lang = language;
}

applyDirection(lng);

i18n.on("languageChanged", (lang) => {
  localStorage.setItem("hqms_lang", lang);
  applyDirection(lang);
});

export default i18n;

