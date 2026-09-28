import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

import en from "@/locales/en.js"
import uz from "@/locales/uz.js"

export const LANGUAGES = [
  { value: "uz", label: "O‘zbekcha", short: "UZ" },
  { value: "en", label: "English", short: "EN" },
]

const DICTIONARIES = { uz, en }
const STORAGE_KEY = "orginfo-lang"
const DEFAULT_LANG = "uz"

const I18nContext = createContext(null)

function readStoredLang() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return DICTIONARIES[stored] ? stored : DEFAULT_LANG
  } catch {
    return DEFAULT_LANG
  }
}

function lookup(dictionary, key) {
  return key.split(".").reduce((node, part) => (node == null ? node : node[part]), dictionary)
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(readStoredLang)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((next) => {
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // storage unavailable; keep the choice for this session only
    }
    setLangState(next)
  }, [])

  // t("lookup.tooShort", { count: 5 }) → dictionary string with {count} filled in; falls back to English, then the key.
  const t = useCallback((key, vars) => {
    let text = lookup(DICTIONARIES[lang], key) ?? lookup(en, key) ?? key
    if (vars) text = text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match))
    return text
  }, [lang])

  // pick({ en: "...", uz: "..." }) → the value for the active language.
  const pick = useCallback((value) => {
    if (value && typeof value === "object" && !Array.isArray(value) && "en" in value) return value[lang] ?? value.en
    return value
  }, [lang])

  const value = useMemo(() => ({ lang, setLang, t, pick }), [lang, setLang, t, pick])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider.")
  }
  return context
}
