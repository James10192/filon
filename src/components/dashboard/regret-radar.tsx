import { useQuery } from 'convex/react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Sparkles, Target } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { m } from '~/lib/paraglide/messages'
import { Button } from '~/components/ui/button'

/**
 * Radar de regret (couche conversion) : surface, calmement, ce que l'utilisateur
 * est en train de laisser filer EN VRAI (ses relations froides, ses relances en
 * retard, ses filleuls qui décrochent), dans le vocabulaire de son lens, puis tend
 * le sauvetage. Aversion à la perte = l'âme du produit (« ne plus laisser filer »),
 * jamais une rareté fabriquée : on n'affiche RIEN s'il n'y a rien qui glisse.
 *
 * Ton volontairement calme (pas de rouge, pas d'alarme) : on éclaire un angle mort
 * et on tend la main. Le palier décide du sauvetage : free -> automatiser (Pro),
 * payant -> aller rattraper tout de suite.
 */
function leadFor(lens: 'emploi' | 'vente' | 'recrutement', count: number): string {
  if (lens === 'vente') return m.radar_lead_vente({ count })
  if (lens === 'recrutement') return m.radar_lead_recrutement({ count })
  return m.radar_lead_emploi({ count })
}

export function RegretRadar() {
  const radar = useQuery(api.conversion.radar.get, {})

  // Pas de donnée, ou rien ne file : on ne montre rien (anti-clutter, anti-fabrication).
  if (!radar || !radar.visible) return null

  const { lens, plan, total, counts } = radar
  const isFree = plan === 'free'

  const parts: string[] = []
  if (counts.opps > 0) parts.push(m.radar_part_opps({ n: counts.opps }))
  if (counts.followups > 0)
    parts.push(m.radar_part_followups({ n: counts.followups }))
  if (counts.network > 0) parts.push(m.radar_part_network({ n: counts.network }))

  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-accent/30 bg-gradient-to-br from-accent/[0.05] to-surface p-5 shadow-[var(--shadow-card)] md:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius)] bg-accent-soft text-accent">
          <Target className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-accent">
            {m.radar_title()}
          </p>
          <h2 className="mt-0.5 text-balance text-base font-semibold tracking-[-0.015em] text-fg">
            {leadFor(lens, total)}
          </h2>
          {parts.length > 0 && (
            <p className="mt-1 text-sm text-fg-muted">{parts.join(' · ')}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-fg-muted">
          {isFree ? m.radar_roi_free() : m.radar_act_hint()}
        </p>
        <Button asChild className="shrink-0">
          {isFree ? (
            <Link to="/app/tarifs">
              <Sparkles className="size-4" />
              {m.radar_cta_upgrade()}
            </Link>
          ) : (
            <Link to="/app/relances">
              {m.radar_cta_act()}
              <ArrowRight className="size-4" />
            </Link>
          )}
        </Button>
      </div>
    </div>
  )
}
