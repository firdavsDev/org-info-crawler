import { createContext, useContext, useEffect, useState } from "react"

const ThemeProviderContext = createContext({
  theme: "system",
  setTheme: () => null,
})

function readStoredTheme(storageKey, defaultTheme) {
  try {
    return localStorage.getItem(storageKey) || defaultTheme
  } catch {
    return defaultTheme
  }
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "orginfo-theme",
  ...props
}) {
  const [theme, setThemeState] = useState(() => readStoredTheme(storageKey, defaultTheme))

  useEffect(() => {
    const root = window.document.documentElement
    const media = window.matchMedia("(prefers-color-scheme: dark)")

    function apply() {
      const resolved = theme === "system" ? (media.matches ? "dark" : "light") : theme
      root.classList.remove("light", "dark")
      root.classList.add(resolved)
      root.style.colorScheme = resolved
    }

    apply()
    if (theme !== "system") return
    media.addEventListener("change", apply)
    return () => media.removeEventListener("change", apply)
  }, [theme])

  const value = {
    theme,
    setTheme: (next) => {
      try {
        localStorage.setItem(storageKey, next)
      } catch {
        // storage unavailable; keep the choice for this session only
      }
      setThemeState(next)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeProviderContext)
}
