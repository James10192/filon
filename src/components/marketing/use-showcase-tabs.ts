import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Logique du sélecteur de vues de la vitrine produit (sans pin/sticky : aucun
 * conflit avec ScrollSmoother).
 *
 * - `active` : index de la vue affichée.
 * - `select(i)` : bascule sur une vue et met l'auto-avance en pause.
 * - Auto-avance : un timer discret fait défiler les vues ; il se met en pause
 *   dès la première interaction utilisateur (clic) et ne reprend pas (respect du
 *   choix de l'utilisateur).
 * - `prefers-reduced-motion` : aucun auto-avance (la sélection manuelle reste).
 *
 * Le crossfade des panneaux est géré côté composant (CSS opacity), pas ici : ce
 * hook ne pilote que l'état, il reste minimal et testable.
 */
export function useShowcaseTabs(count: number, intervalMs = 4200) {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  const select = useCallback((i: number) => {
    setActive(i)
    setPaused(true)
  }, [])

  const reducedRef = useRef(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    reducedRef.current = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
  }, [])

  useEffect(() => {
    if (paused || count <= 1) return
    if (typeof window === 'undefined' || reducedRef.current) return
    const id = window.setInterval(() => {
      setActive((prev) => (prev + 1) % count)
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [paused, count, intervalMs])

  return { active, select, paused }
}
