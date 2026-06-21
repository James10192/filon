import { ArrowUp } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'
import { cn } from '~/lib/utils'
import { scrollToTop, useScrollState } from './use-scroll-state'

/**
 * Bouton flottant « retour en haut ». Apparait une fois la page suffisamment
 * defilee (donc disponible jusqu'au footer), remonte en douceur via
 * ScrollSmoother. Masque tant qu'on est en haut (transition opacite + translation),
 * `aria-hidden`/`tabIndex` retires de l'ordre de tabulation quand invisible.
 */
export function LandingScrollTop() {
  const { showTop } = useScrollState()

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label={m.scroll_top_aria()}
      aria-hidden={!showTop}
      tabIndex={showTop ? 0 : -1}
      className={cn(
        'fixed bottom-5 right-5 z-50 flex size-11 items-center justify-center rounded-full border border-border bg-surface text-fg shadow-[var(--shadow-card)] backdrop-blur-xl transition-[opacity,transform] duration-300 ease-out hover:border-border-strong hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-ring)] md:bottom-7 md:right-7',
        showTop
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-3 opacity-0',
      )}
    >
      <ArrowUp className="size-5" />
    </button>
  )
}
