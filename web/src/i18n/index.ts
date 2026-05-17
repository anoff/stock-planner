import { createContext, useContext } from 'react';
import type { Translations } from './translations';
import en from './en';
import ja from './ja';

export type Language = 'en' | 'ja';

const TRANSLATIONS: Record<Language, Translations> = { en, ja };

export const LANGUAGES = TRANSLATIONS;

/** Detect the preferred language from the browser locale. Defaults to 'en'. */
export function detectBrowserLanguage(): Language {
  if (typeof navigator === 'undefined') return 'en';
  const primary = navigator.language?.split('-')[0]?.toLowerCase();
  return primary === 'ja' ? 'ja' : 'en';
}

const LS_KEY = 'stock-planner-language';

export function loadLanguage(): Language {
  try {
    const stored = localStorage.getItem(LS_KEY) as Language | null;
    if (stored === 'en' || stored === 'ja') return stored;
  } catch {
    // localStorage unavailable (e.g. SSR / private mode)
  }
  return detectBrowserLanguage();
}

export function saveLanguage(lang: Language): void {
  try {
    localStorage.setItem(LS_KEY, lang);
  } catch {
    // ignore
  }
}

export interface LanguageContextType {
  language: Language;
  t: Translations;
  toggleLanguage: () => void;
}

const defaultCtx: LanguageContextType = {
  language: 'en',
  t: en,
  toggleLanguage: () => {},
};

export const LanguageContext = createContext<LanguageContextType>(defaultCtx);
export const useLanguage = () => useContext(LanguageContext);
