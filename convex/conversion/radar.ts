import { query } from '../_generated/server'
import { optionalUser, currentPlan } from '../lib/withUser'
import { ACTIVE_STAGES } from '../lib/plan'

/**
 * Filon · Radar de regret (couche conversion, universelle, NON gatée).
 *
 * Le coeur de la thèse de conversion : Filon s'appelle « ne plus laisser filer ».
 * Cette query surface, pour TOUS les paliers, ce que l'utilisateur est en train
 * de laisser filer EN VRAI (ses propres relations qui refroidissent, ses relances
 * en retard, ses filleuls qui décrochent) — jamais une rareté fabriquée. Le lens
 * (`stageLabelSet`) ne change que le NOM (opportunités / relations / candidats) ;
 * l'émotion (l'aversion à la perte) est universelle.
 *
 * Déterministe, scopée `userId`, lectures via index `by_user*`. Renvoie des
 * COMPTES (pas de listes) : la carte dashboard les met en récit + ROI + sauvetage.
 */

type Lens = 'emploi' | 'vente' | 'recrutement'

function todayISO(): string {
  return new Date(Date.now()).toISOString().slice(0, 10)
}

export const get = query({
  args: {},
  handler: async (ctx) => {
    const user = await optionalUser(ctx)
    if (!user) return { visible: false as const }
    const { userId } = user
    const today = todayISO()

    const userDoc = await ctx.db
      .query('users')
      .withIndex('by_authId', (q) => q.eq('authId', userId))
      .unique()
    const lens: Lens =
      userDoc?.stageLabelSet === 'vente' ||
      userDoc?.stageLabelSet === 'recrutement'
        ? userDoc.stageLabelSet
        : 'emploi'
    const plan = await currentPlan(ctx, userId)

    // Opportunités actives qui glissent : aucune prochaine action OU échéance
    // dépassée. On compte les opportunités DISTINCTES (pas de double comptage).
    const opps = await ctx.db
      .query('opportunities')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()
    const active = opps.filter((o) =>
      (ACTIVE_STAGES as readonly string[]).includes(o.stage),
    )
    const slippingOpps = active.filter(
      (o) =>
        !o.nextActionAt ||
        o.nextActionAt < today ||
        (o.deadline != null && o.deadline < today),
    ).length

    // Relances en retard (échéance passée, non faites).
    const openFollowups = await ctx.db
      .query('followups')
      .withIndex('by_user_done', (q) =>
        q.eq('userId', userId).eq('done', false),
      )
      .collect()
    const overdueFollowups = openFollowups.filter((f) => f.dueDate < today).length

    // Filleuls qui décrochent (réseau à risque ou inactif) — pertinent surtout
    // pour le persona relationnel, neutre sinon.
    const atRisk = await ctx.db
      .query('contacts')
      .withIndex('by_user_mlmStatus', (q) =>
        q.eq('userId', userId).eq('mlmStatus', 'at_risk'),
      )
      .collect()
    const inactive = await ctx.db
      .query('contacts')
      .withIndex('by_user_mlmStatus', (q) =>
        q.eq('userId', userId).eq('mlmStatus', 'inactive'),
      )
      .collect()
    const slippingNetwork = atRisk.length + inactive.length

    const total = slippingOpps + overdueFollowups + slippingNetwork

    return {
      visible: total > 0,
      lens,
      plan,
      total,
      counts: {
        opps: slippingOpps,
        followups: overdueFollowups,
        network: slippingNetwork,
      },
    }
  },
})
