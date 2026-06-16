import * as React from 'react'

/**
 * S'abonne à une media query CSS et renvoie son état courant. Init paresseuse
 * (lit `matchMedia` au premier rendu côté client) pour éviter un flash, défaut
 * `false` côté serveur. Exemple : `useMediaQuery('(min-width: 1024px)')`.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  )

  React.useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}
