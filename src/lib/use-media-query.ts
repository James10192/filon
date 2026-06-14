import { useEffect, useState } from 'react'

/**
 * Hook media-query SSR-safe. Renvoie `false` jusqu'au montage client (pas de
 * mismatch d'hydratation), puis reflète l'état réel et écoute les changements.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}
