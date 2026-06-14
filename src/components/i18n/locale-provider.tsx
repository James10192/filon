import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { getLocale, setLocale, type Locale } from '~/lib/paraglide/runtime'

/**
 * Contexte de langue reactif (anti full-reload). Paraglide recharge la page par
 * defaut a chaque `setLocale` : ici on passe `{ reload: false }` et on force un
 * re-render de tout l'arbre via un compteur d'etat, pose `<html lang>` sans
 * reload, et expose la locale courante + un `switchLocale`.
 *
 * Au SSR et avant montage, on rend la baseLocale (fr) pour eviter tout mismatch
 * d'hydratation ; la vraie locale (localStorage "filon-locale") prend le relais
 * apres le mount.
 */
type LocaleContextValue = {
  locale: Locale
  switchLocale: (next: Locale) => void
  mounted: boolean
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fr')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setLocaleState(getLocale())
    setMounted(true)
  }, [])

  const switchLocale = useCallback(
    (next: Locale) => {
      if (next === locale) return
      // Pas de reload : on met a jour la locale Paraglide en mode silencieux,
      // puis on re-render l'arbre React et on pose <html lang>.
      void setLocale(next, { reload: false })
      setLocaleState(next)
      try {
        document.documentElement.lang = next
      } catch {
        /* document indisponible : on ignore */
      }
    },
    [locale],
  )

  return (
    <LocaleContext.Provider value={{ locale, switchLocale, mounted }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    throw new Error('useLocale doit etre utilise dans un <LocaleProvider>')
  }
  return ctx
}
