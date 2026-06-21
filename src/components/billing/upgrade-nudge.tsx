import { useEffect, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { Sparkles, X } from 'lucide-react'
import { NUDGES, type NudgeId } from '~/lib/billing/conversion'
import { m } from '~/lib/paraglide/messages'
import { useUpsell } from '~/lib/billing/use-upsell'
import { cn } from '~/lib/utils'
import { Button } from '~/components/ui/button'

/**
 * Bandeau d'upsell contextuel, raffiné et dismissible (PAS un modal). Une seule
 * CTA vers /app/tarifs. S'auto-masque si le nudge n'est pas affichable (palier,
 * cap journalier, déjà fermé) — c'est `useUpsell().shouldNudge` qui tranche.
 *
 * Marque l'affichage au montage (compte dans le cap du jour) et persiste la
 * fermeture (ne réapparaît jamais). Entrée GSAP <300ms (moment de valeur),
 * respecte prefers-reduced-motion.
 *
 * `variant` :
 *  - `value`    accent doux (récompense / proactif).
 *  - `friction` neutre (proche d'un plafond).
 */
export function UpgradeNudge({
  id,
  variant = 'value',
  className,
}: {
  id: NudgeId
  variant?: 'value' | 'friction'
  className?: string
}) {
  const { shouldNudge, markNudgeShown, dismissNudge } = useUpsell()
  const visible = shouldNudge(id)
  const cardRef = useRef<HTMLDivElement | null>(null)

  // Comptabilise l'affichage une seule fois quand le nudge devient visible.
  useEffect(() => {
    if (visible) markNudgeShown(id)
  }, [visible, id, markNudgeShown])

  // Entrée animée (séduction) — uniquement si visible et mouvement autorisé.
  useEffect(() => {
    if (!visible || typeof window === 'undefined') return
    const el = cardRef.current
    if (!el) return
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (prefersReduced) return

    let ctx: { revert: () => void } | undefined
    let cancelled = false
    void (async () => {
      const { gsap } = await import('gsap')
      if (cancelled) return
      ctx = gsap.context(() => {
        gsap.from(el, { autoAlpha: 0, y: 12, duration: 0.28, ease: 'power2.out' })
      })
    })()
    return () => {
      cancelled = true
      ctx?.revert()
    }
  }, [visible])

  if (!visible) return null

  const copy = NUDGES[id]

  return (
    <div
      ref={cardRef}
      className={cn(
        'relative flex items-start gap-3 rounded-[var(--radius-lg)] border px-4 py-3.5 shadow-[var(--shadow-card)]',
        variant === 'value'
          ? 'border-accent/30 bg-accent-soft/40'
          : 'border-border bg-surface',
        className,
      )}
    >
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-accent-soft text-accent">
        <Sparkles className="size-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <h3 className="text-sm font-semibold text-fg">{copy.title()}</h3>
        <p className="text-sm leading-relaxed text-fg-muted">{copy.body()}</p>
        <Button size="sm" variant="outline" className="mt-1" asChild>
          <Link to="/app/tarifs">{copy.cta()}</Link>
        </Button>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={m.app_dismiss()}
        className="-mr-1 -mt-1 shrink-0 text-fg-subtle"
        onClick={() => dismissNudge(id)}
      >
        <X className="size-4" />
      </Button>
    </div>
  )
}
