import { useEffect, useState } from 'react'

/**
 * Etat de défilement partagé de la landing (header flottant + bouton « haut de
 * page »). Deux sources selon l'environnement :
 *  - Desktop : ScrollSmoother détourne le scroll natif, un listener `window
 *    scroll` ne se déclenche pas. `useLandingMotion` diffuse donc l'état via
 *    l'event `filon:scroll` (lu d'un ScrollTrigger qui suit le scroll virtuel).
 *  - Mobile / tactile : ScrollSmoother est désactivé, le scroll natif fait foi.
 *    On écoute alors `window scroll` et on calcule la direction nous-mêmes.
 *
 * `scrolled` : passé le seuil de compactage (header dense).
 * `hidden`   : on défile vers le BAS au-delà d'un seuil → header masqué (révélé
 *              au moindre défilement vers le HAUT, façon navbar flottante).
 * `showTop`  : assez défilé pour proposer le retour en haut de page.
 */
export type ScrollState = {
  scrolled: boolean
  hidden: boolean
  showTop: boolean
}

const SCROLLED_AT = 20
const HIDE_AT = 140

export function useScrollState(): ScrollState {
  const [state, setState] = useState<ScrollState>({
    scrolled: false,
    hidden: false,
    showTop: false,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const onCustom = (e: Event) => {
      const d = (e as CustomEvent<Partial<ScrollState>>).detail
      setState({
        scrolled: Boolean(d?.scrolled),
        hidden: Boolean(d?.hidden),
        showTop: Boolean(d?.showTop),
      })
    }

    let lastY = window.scrollY
    const onNative = () => {
      const y = window.scrollY
      const down = y > lastY
      lastY = y
      setState({
        scrolled: y > SCROLLED_AT,
        hidden: down && y > HIDE_AT,
        showTop: y > window.innerHeight * 0.6,
      })
    }

    window.addEventListener('filon:scroll', onCustom)
    window.addEventListener('scroll', onNative, { passive: true })
    onNative()

    return () => {
      window.removeEventListener('filon:scroll', onCustom)
      window.removeEventListener('scroll', onNative)
    }
  }, [])

  return state
}

/**
 * Retour en haut de page, en douceur. ScrollSmoother détourne le scroll : on
 * passe par son instance quand elle existe, sinon fallback scroll natif lissé.
 */
export function scrollToTop() {
  if (typeof window === 'undefined') return
  const w = window as typeof window & {
    ScrollSmoother?: {
      get: () => { scrollTo: (t: number | Element, smooth: boolean) => void } | undefined
    }
  }
  const smoother = w.ScrollSmoother?.get?.()
  if (smoother) {
    smoother.scrollTo(0, true)
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}
