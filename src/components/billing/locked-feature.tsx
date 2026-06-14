import { useEffect, useRef, useState } from 'react'
import { Lock, Sparkles } from 'lucide-react'
import {
  FEATURES,
  requiredPlanLabel,
  type FeatureId,
} from '~/lib/billing/conversion'
import { useUpsell } from '~/lib/billing/use-upsell'
import { cn } from '~/lib/utils'
import { Badge } from '~/components/ui/badge'
import { UpgradeDialog } from './upgrade-dialog'

/**
 * Verrou élégant d'une fonctionnalité premium. Si le palier courant débloque la
 * fonctionnalité, rend les enfants tels quels. Sinon, ghoste le contenu
 * (opacité réduite, non interactif) sous un badge discret (« Pro » / « Pro+ IA »)
 * et une pastille de cadenas ; le clic ouvre le dialog de valeur + upgrade.
 *
 * Anti-slop : pas de rouge, pas de « UPGRADE NOW ». Verrou = ghosting sobre.
 * Révélation GSAP <300ms sur le cartouche au montage (respecte reduced-motion).
 *
 * `pro_ai` ne verrouille rien : un payeur au plus haut palier voit tout déverrouillé.
 */
export function LockedFeature({
  feature,
  children,
  className,
  /** Étiquette d'invitation affichée sous le cadenas (sinon le titre feature). */
  label,
}: {
  feature: FeatureId
  children: React.ReactNode
  className?: string
  label?: string
}) {
  const { canUse } = useUpsell()
  const [open, setOpen] = useState(false)
  const overlayRef = useRef<HTMLButtonElement | null>(null)

  // Révélation subtile du cartouche de verrou (moment de séduction).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const el = overlayRef.current
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
        gsap.from(el, { autoAlpha: 0, y: 8, duration: 0.28, ease: 'power2.out' })
      })
    })()
    return () => {
      cancelled = true
      ctx?.revert()
    }
  }, [])

  if (canUse(feature)) return <>{children}</>

  const copy = FEATURES[feature]

  return (
    <div className={cn('relative', className)}>
      {/* Contenu fantôme : visible mais inerte (aria-hidden + pointer-events). */}
      <div aria-hidden className="pointer-events-none select-none opacity-45 blur-[0.5px]">
        {children}
      </div>

      {/* Couche d'invitation cliquable par-dessus. */}
      <button
        ref={overlayRef}
        type="button"
        onClick={() => setOpen(true)}
        className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-bg/40 backdrop-blur-[1px] transition-colors hover:bg-bg/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span className="flex items-center gap-2 rounded-[var(--radius)] border border-border bg-surface px-3 py-1.5 shadow-[var(--shadow-card)]">
          <Lock className="size-3.5 text-fg-muted" />
          <span className="text-sm font-medium text-fg">
            {label ?? copy.title}
          </span>
          <Badge variant="accent" className="gap-1">
            <Sparkles className="size-3" />
            {requiredPlanLabel(copy.requires)}
          </Badge>
        </span>
      </button>

      <UpgradeDialog feature={feature} open={open} onOpenChange={setOpen} />
    </div>
  )
}
