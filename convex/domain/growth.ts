import { query } from '../_generated/server'
import { requireUser } from '../lib/withUser'

function daysSince(timestamp: number) {
  return Math.floor((Date.now() - timestamp) / 86_400_000)
}

export const clientCycle = query({
  args: {},
  handler: async ctx => {
    const { userId } = await requireUser(ctx)
    const won = await ctx.db.query('opportunities').withIndex('by_user', q => q.eq('userId', userId)).collect()
    const clients = won.filter(item => item.stage === 'won')
    return clients.map(client => {
      const age = daysSince(client.updatedAt)
      const phase = age < 14 ? 'onboarding' : age < 45 ? 'satisfaction' : age < 90 ? 'renewal' : 'upsell'
      const signals = [
        age >= 45 ? 'Aucun point récent à confirmer' : 'Relation récente',
        client.nextActionAt ? `Prochaine action le ${client.nextActionAt}` : 'Aucune prochaine action planifiée',
      ]
      return { id: client._id, title: client.title, phase, age, signals, nextActionAt: client.nextActionAt ?? null }
    }).sort((a, b) => b.age - a.age).slice(0, 12)
  },
})
