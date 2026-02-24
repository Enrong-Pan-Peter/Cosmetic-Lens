import en from './en.json';
import zh from './zh.json';

const translations = { en, zh } as const;

export type Language = 'en' | 'zh';

export function getTranslations(lang: Language) {
  return translations[lang] || translations.en;
}

export function getLanguageFromURL(url: URL): Language {
  const path = url.pathname;
  if (path.startsWith('/zh')) return 'zh';
  return 'en';
}

export function getAlternateLanguagePath(currentPath: string, currentLang: Language): string {
  const newLang = currentLang === 'en' ? 'zh' : 'en';
  const pathWithoutLang = currentPath.replace(/^\/(en|zh)/, '');
  return `/${newLang}${pathWithoutLang || '/'}`;
}

// Deep access helper for nested keys like "nav.home"
export function t(translations: any, key: string): string {
  const keys = key.split('.');
  let value = translations;
  for (const k of keys) {
    value = value?.[k];
  }
  return value || key;
}
