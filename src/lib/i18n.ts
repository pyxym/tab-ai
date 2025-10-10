import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translations
import enTranslations from '../locales/en.json';
import jaTranslations from '../locales/ja.json';
import koTranslations from '../locales/ko.json';

const resources = {
  en: {
    translation: enTranslations,
  },
  ko: {
    translation: koTranslations,
  },
  ja: {
    translation: jaTranslations,
  },
};

// Get saved language from storage or use browser language
async function getSavedLanguage(): Promise<string> {
  try {
    const result = await chrome.storage.sync.get('language');
    if (result.language) {
      return result.language;
    }
  } catch {
    // Chrome storage not available
  }

  // Fallback to browser language if available
  if (typeof navigator !== 'undefined') {
    return navigator.language.split('-')[0];
  }

  return 'en'; // Default fallback
}

// Initialize i18n
export async function initI18n() {
  const savedLang = await getSavedLanguage();

  const i18nInstance = i18n.createInstance();

  await i18nInstance.use(initReactI18next).init({
    resources,
    lng: savedLang,
    fallbackLng: 'en',
    debug: false,

    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

  return i18nInstance;
}

// Store the current i18n instance
let currentI18nInstance: any = null;

// Get current i18n instance
export function getCurrentI18n() {
  return currentI18nInstance;
}

// Set current i18n instance
export function setCurrentI18n(instance: any) {
  currentI18nInstance = instance;
}

// Change language and save preference
export async function changeLanguage(lng: string) {
  await chrome.storage.sync.set({ language: lng });
  if (currentI18nInstance) {
    await currentI18nInstance.changeLanguage(lng);
  }
}

export default i18n;
