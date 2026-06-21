import { v } from 'convex/values'
import { mutation } from './_generated/server'
import { requireUser } from './lib/withUser'

/**
 * Import rapide du carnet (activation « non-vide-vite »).
 *
 * Création en masse de contacts à partir d'une liste collée (un par ligne). Le
 * but : qu'un nouvel utilisateur (surtout les personas relationnels) ait un
 * carnet PLEIN en 60 secondes, condition pour que le reste du produit (Radar,
 * pipeline) ait de la matière. Scopée `userId`, bornée (anti-abus). Le
 * dédoublonnage est laissé à l'utilisateur (pas de fusion silencieuse).
 *
 * Fichier dédié exprès : `convex/contacts.ts` est déjà à 314 LOC (god file
 * préexistant), on ne l'alourdit pas.
 */
const BULK_CAP = 300

export const bulkCreate = mutation({
  args: {
    entries: v.array(
      v.object({
        name: v.string(),
        phone: v.optional(v.string()),
        notes: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { entries }): Promise<{ created: number }> => {
    const { userId } = await requireUser(ctx)
    const now = Date.now()
    let created = 0
    for (const entry of entries.slice(0, BULK_CAP)) {
      const name = entry.name.trim()
      if (!name) continue
      const doc: {
        userId: string
        name: string
        phone?: string
        notes?: string
        createdAt: number
      } = { userId, name, createdAt: now }
      if (entry.phone?.trim()) doc.phone = entry.phone.trim()
      if (entry.notes?.trim()) doc.notes = entry.notes.trim()
      await ctx.db.insert('contacts', doc)
      created += 1
    }
    return { created }
  },
})
