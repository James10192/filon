import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '~/components/ui/button'

/**
 * Gestion du theme clair/sombre, 100 % client-only.
 *
 * - Lit la cle localStorage "filon-theme" ("light" | "dark"), avec fallback
 *   sur la preference systeme (prefers-color-scheme).
 * - N'applique/retire la classe `.dark` sur <html> qu'APRES le montage cote
 *   client : aucune ecriture pendant le SSR ni au premier rendu d'hydratation,
 *   pour eviter tout mismatch d'hydratation. __root.tsx n'est jamais touche.
 */

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'filon-theme'

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  mounted: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readStoredTheme(): Theme | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    /* localStorage indisponible : on ignore */
  }
  return null
}

function systemTheme(): Theme {
  try {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  } catch {
    /* matchMedia indisponible : on retombe sur clair */
  }
  return 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Valeur stable au SSR + premier rendu (clair), pour ne pas casser
  // l'hydratation. La vraie valeur est resolue apres montage.
  const [theme, setThemeState] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  // Resolution + application uniquement cote client, apres montage.
  useEffect(() => {
    const resolved = readStoredTheme() ?? systemTheme()
    setThemeState(resolved)
    setMounted(true)
  }, [])

  // Applique la classe .dark sur <html> a chaque changement, post-montage.
  useEffect(() => {
    if (!mounted) return
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
  }, [theme, mounted])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* persistance impossible : on garde l'etat en memoire */
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      try {
        window.localStorage.setItem(STORAGE_KEY, next)
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme doit etre utilise dans un <ThemeProvider>.')
  }
  return ctx
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme, mounted } = useTheme()
  const isDark = theme === 'dark'

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={toggleTheme}
      className={className}
      aria-label={isDark ? 'Passer en theme clair' : 'Passer en theme sombre'}
      title={isDark ? 'Theme clair' : 'Theme sombre'}
    >
      {/* Avant montage, on rend une icone stable (soleil) pour eviter le
          mismatch d'hydratation, puis l'icone reelle prend le relais. */}
      {mounted && isDark ? (
        <Moon className="size-4.5" />
      ) : (
        <Sun className="size-4.5" />
      )}
    </Button>
  )
}
