'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from 'react'
import { DEFAULT_LANG, LANG_COOKIE, normalizeLang, t as translate, localizeField } from '@/lib/i18n'

const LanguageContext = createContext(null)

// Same-tab notification for a language change (a cookie write raises no event).
const LANG_EVENT = 'sajha:lang-change'

function readCookieLang() {
  if (typeof document === 'undefined') return DEFAULT_LANG
  const match = document.cookie.match(/(?:^|;\s*)lang=([^;]+)/)
  return normalizeLang(match ? decodeURIComponent(match[1]) : DEFAULT_LANG)
}

function subscribe(onChange) {
  window.addEventListener(LANG_EVENT, onChange)
  return () => window.removeEventListener(LANG_EVENT, onChange)
}

/**
 * English/Nepali state for the whole app.
 *
 * The choice is stored in a `lang` cookie and read through useSyncExternalStore:
 * the server render (and the hydration pass) uses the English default, then the
 * stored value takes over, so no route has to become dynamic and no route can
 * mismatch its server HTML.
 */
export function LanguageProvider({ children }) {
  const lang = useSyncExternalStore(subscribe, readCookieLang, () => DEFAULT_LANG)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((next) => {
    const value = normalizeLang(next)
    try {
      document.cookie = `${LANG_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`
    } catch {
      // Cookie blocked: the choice still applies for this page.
    }
    window.dispatchEvent(new Event(LANG_EVENT))
  }, [])

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t: (text, vars) => translate(lang, text, vars),
      localize: (item, fieldName) => localizeField(item, fieldName, lang),
    }),
    [lang, setLang]
  )

  return <LanguageContext value={value}>{children}</LanguageContext>
}

/** `{ lang, setLang, t(text, vars), localize(item, field) }`. */
export function useLanguage() {
  const value = useContext(LanguageContext)
  if (!value) {
    // Components also render inside tests and isolated previews; fall back to
    // English rather than throwing.
    return {
      lang: DEFAULT_LANG,
      setLang: () => {},
      t: (text, vars) => translate(DEFAULT_LANG, text, vars),
      localize: (item, fieldName) => localizeField(item, fieldName, DEFAULT_LANG),
    }
  }
  return value
}
