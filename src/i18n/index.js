export {
  LOCALE_FLAGS,
  LOCALE_NATIVE_NAMES,
  SUPPORTED_LOCALES,
} from './meta.js';
import { LOCALE_ALIASES } from './meta.js';
import { TRANSLATIONS } from './locales/index.js';

let activeLocale = 'en';

function matchLocale(language) {
  const normalized = String(language || '').trim().toLowerCase();
  return LOCALE_ALIASES[normalized] || LOCALE_ALIASES[normalized.split('-')[0]] || null;
}

function detectBrowserLocale() {
  const languages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  for (const language of languages) {
    const locale = matchLocale(language);
    if (locale) return locale;
  }
  return 'en';
}

export function configureLocale(preference = 'auto') {
  activeLocale =
    preference === 'auto' ? detectBrowserLocale() : matchLocale(preference) || 'en';
  return activeLocale;
}

export function getActiveLocale() {
  return activeLocale;
}

export function formatNumber(value) {
  return new Intl.NumberFormat(activeLocale).format(value);
}

export function t(key, params = {}) {
  const template = TRANSLATIONS[activeLocale]?.[key] ?? TRANSLATIONS.en[key] ?? key;
  return Object.entries(params).reduce(
    (value, [name, replacement]) =>
      value.split(`{${name}}`).join(String(replacement)),
    template,
  );
}
