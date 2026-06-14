import { useEffect, useState } from 'react'

/**
 * Detecte la plateforme cote client pour afficher le bon raccourci :
 * macOS -> « ⌘K », Windows / Linux -> « Ctrl K ».
 *
 * SSR-safe : avant montage, on retourne un libelle neutre (« Ctrl K ») pour
 * eviter tout mismatch d'hydratation. Le vrai libelle est resolu apres montage.
 */
export function useShortcutLabel(): string {
  const [isMac, setIsMac] = useState(false)

  useEffect(() => {
    if (typeof navigator === 'undefined') return
    const platform =
      (
        navigator as Navigator & {
          userAgentData?: { platform?: string }
        }
      ).userAgentData?.platform ??
      navigator.platform ??
      navigator.userAgent ??
      ''
    setIsMac(/mac|iphone|ipad|ipod/i.test(platform))
  }, [])

  return isMac ? '⌘K' : 'Ctrl K'
}
