import { createContext, useContext, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  resolvedTheme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const ADMIN_STORAGE_KEY = 'spreadnfc_admin_theme'

export function applyThemeToDOM(targetTheme: Theme = 'light') {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const body = document.body

  if (targetTheme === 'dark') {
    root.classList.add('dark')
    body?.classList.add('dark')
    root.setAttribute('data-theme', 'dark')
    root.style.colorScheme = 'dark'
  } else {
    root.classList.remove('dark')
    body?.classList.remove('dark')
    root.setAttribute('data-theme', 'light')
    root.style.colorScheme = 'light'
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(ADMIN_STORAGE_KEY)
      if (saved === 'dark' || saved === 'light') return saved
    } catch {}
    return 'light'
  })

  function setTheme(newTheme: Theme) {
    setThemeState(newTheme)
    try {
      localStorage.setItem(ADMIN_STORAGE_KEY, newTheme)
    } catch {}
    applyThemeToDOM(newTheme)
  }

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme: theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return ctx
}
