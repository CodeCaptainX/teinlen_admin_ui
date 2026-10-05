import { computed, ref } from 'vue'
import en, { type MessageKey } from './messages/en'
import km from './messages/km'
import zh from './messages/zh'

// adminLanguage is the admin UI's text lookup. It follows the member UI's approach (a typed dictionary and a
// small translate function, no i18n library) but keeps the current language in a Vue ref, so every template
// and computed value that calls t() re-renders by itself when the admin switches language.

export type { MessageKey }

// AdminLanguage lists the languages the admin UI and the admin API both support.
export type AdminLanguage = 'en' | 'km' | 'zh'

// ADMIN_LANGUAGES drives the language switcher; each label is written in its own language so it can be found.
export const ADMIN_LANGUAGES: Array<{ value: AdminLanguage; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'km', label: 'ខ្មែរ' },
  { value: 'zh', label: '中文' },
]

// ADMIN_LANGUAGE_STORAGE_KEY is separate from the member UI key so the two apps keep their own choice.
const ADMIN_LANGUAGE_STORAGE_KEY = 'tienlen:admin-language'
const DEFAULT_ADMIN_LANGUAGE: AdminLanguage = 'en'

const MESSAGES: Record<AdminLanguage, Record<MessageKey, string>> = { en, km, zh }

// LOCALE_TAGS are the Intl locales used for dates and numbers in each language.
const LOCALE_TAGS: Record<AdminLanguage, string> = { en: 'en-US', km: 'km-KH', zh: 'zh-CN' }

// isAdminLanguage guards values read from storage, which a user or an old version may have changed.
function isAdminLanguage(value: unknown): value is AdminLanguage {
  return value === 'en' || value === 'km' || value === 'zh'
}

// readStoredLanguage restores the saved choice. Storage can be blocked (private windows), so it falls back.
function readStoredLanguage(): AdminLanguage {
  try {
    const stored = localStorage.getItem(ADMIN_LANGUAGE_STORAGE_KEY)
    return isAdminLanguage(stored) ? stored : DEFAULT_ADMIN_LANGUAGE
  } catch {
    return DEFAULT_ADMIN_LANGUAGE
  }
}

const currentLanguage = ref<AdminLanguage>(readStoredLanguage())
document.documentElement.lang = currentLanguage.value

// getAdminLanguage returns the current language for non-Vue code (the API client header).
export function getAdminLanguage(): AdminLanguage {
  return currentLanguage.value
}

// setAdminLanguage switches the UI language, remembers it, and updates <html lang> for screen readers and
// fonts. Saving can fail when storage is blocked; the switch still works for this session.
export function setAdminLanguage(language: AdminLanguage): void {
  currentLanguage.value = language
  document.documentElement.lang = language
  try {
    localStorage.setItem(ADMIN_LANGUAGE_STORAGE_KEY, language)
  } catch {
    // Remembering the choice is best-effort.
  }
}

// useAdminLanguage is a v-model-friendly handle for the language switcher.
export function useAdminLanguage() {
  return computed<AdminLanguage>({
    get: () => currentLanguage.value,
    set: (language) => setAdminLanguage(language),
  })
}

// localeTag returns the Intl locale for the current language, used by lib/format.ts.
export function localeTag(): string {
  return LOCALE_TAGS[currentLanguage.value]
}

// t returns the text for key in the current language and fills {name} placeholders from params. It falls back
// to English per key, although the typed message files already make a missing key a build error.
export function t(key: MessageKey, params: Record<string, string | number> = {}): string {
  const text = MESSAGES[currentLanguage.value][key] ?? en[key]
  return text.replace(/\{(\w+)\}/g, (placeholder, name: string) => (name in params ? String(params[name]) : placeholder))
}
