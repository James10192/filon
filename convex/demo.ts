import { v } from 'convex/values'
import { internalMutation } from './_generated/server'
import { createAuth } from './auth'
import type { Doc } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'

type DemoIdentity = {
  authId: string
  email: string
  password: string
  created: boolean
}

type DemoSeedResult =
  | { seeded: false; companies: number }
  | {
      seeded: true
      companies: number
      contacts: number
      opportunities: number
      followups: number
      proposals: number
    }

function stageLabelSetForActivity(
  activityType: string,
): 'emploi' | 'vente' | 'recrutement' {
  if (activityType === 'recruteur') return 'recrutement'
  if (
    activityType === 'commercial' ||
    activityType === 'freelance_dev' ||
    activityType === 'consultant' ||
    activityType === 'ambassadeur' ||
    activityType === 'agent_immo' ||
    activityType === 'agent_assurance' ||
    activityType === 'autre'
  ) {
    return 'vente'
  }
  return 'emploi'
}

async function findUserByEmail(
  ctx: MutationCtx,
  email: string,
) {
  return ctx.db
    .query('users')
    .withIndex('by_email', (q) => q.eq('email', email))
    .unique()
}

async function seedWorkspaceData(
  ctx: MutationCtx,
  userId: string,
): Promise<DemoSeedResult> {
  const existingCompanies = await ctx.db
    .query('companies')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect()
  if (existingCompanies.length > 0) {
    return {
      seeded: false,
      companies: existingCompanies.length,
    }
  }

  const now = Date.now()
  const companyA = await ctx.db.insert('companies', {
    userId,
    name: 'Soro Distribution',
    sector: 'Distribution B2B',
    location: 'Abidjan',
    source: 'Réseau',
    notes: 'Compte stratégique à convertir avant la rentrée.',
    createdAt: now - 1000 * 60 * 60 * 24 * 8,
  })
  const companyB = await ctx.db.insert('companies', {
    userId,
    name: 'Kone Habitat',
    sector: 'Immobilier',
    location: 'Cocody',
    source: 'Prospection',
    notes: 'Besoin d’une proforma pour un accompagnement commercial.',
    createdAt: now - 1000 * 60 * 60 * 24 * 6,
  })
  const companyC = await ctx.db.insert('companies', {
    userId,
    name: 'Amani Conseil RH',
    sector: 'Conseil',
    location: 'Plateau',
    source: 'Referral',
    notes: 'Décideuse très réactive, veut du suivi rigoureux.',
    createdAt: now - 1000 * 60 * 60 * 24 * 4,
  })

  const contactA = await ctx.db.insert('contacts', {
    userId,
    companyId: companyA,
    name: 'Awa Soro',
    role: 'Directrice commerciale',
    email: 'awa.soro@example.com',
    phone: '+2250700000001',
    notes: 'Attend une proposition courte et chiffrée.',
    tags: ['VIP', 'Décideur'],
    createdAt: now - 1000 * 60 * 60 * 24 * 8,
  })
  const contactB = await ctx.db.insert('contacts', {
    userId,
    companyId: companyB,
    name: 'Moussa Kone',
    role: 'Fondateur',
    email: 'moussa.kone@example.com',
    phone: '+2250700000002',
    notes: 'A demandé un rappel en début de semaine.',
    tags: ['Prospect chaud'],
    createdAt: now - 1000 * 60 * 60 * 24 * 6,
  })
  const contactC = await ctx.db.insert('contacts', {
    userId,
    companyId: companyC,
    name: 'Nadia Amani',
    role: 'Managing partner',
    email: 'nadia.amani@example.com',
    phone: '+2250700000003',
    notes: 'Très intéressée par le coaching pipeline.',
    tags: ['Referral'],
    createdAt: now - 1000 * 60 * 60 * 24 * 4,
  })

  const opportunityA = await ctx.db.insert('opportunities', {
    userId,
    title: 'Déployer Filon pour structurer la prospection',
    type: 'prospect',
    companyId: companyA,
    contactId: contactA,
    source: 'Réseau',
    targetType: 'company',
    sourceChannel: 'networking',
    stage: 'negotiation',
    priority: 'high',
    nextActionAt: '2026-07-02',
    tags: ['VIP', 'B2B'],
    description: 'Cycle avancé, attente de validation budgétaire.',
    createdAt: now - 1000 * 60 * 60 * 24 * 8,
    updatedAt: now - 1000 * 60 * 60 * 6,
    order: 10,
  })
  const opportunityB = await ctx.db.insert('opportunities', {
    userId,
    title: 'Proforma accompagnement commercial',
    type: 'mission',
    companyId: companyB,
    contactId: contactB,
    source: 'Prospection',
    targetType: 'company',
    sourceChannel: 'cold',
    stage: 'contacted',
    priority: 'medium',
    nextActionAt: '2026-07-01',
    tags: ['Immobilier'],
    description: 'Premier cadrage envoyé, relance prévue demain.',
    createdAt: now - 1000 * 60 * 60 * 24 * 6,
    updatedAt: now - 1000 * 60 * 60 * 18,
    order: 20,
  })
  const opportunityC = await ctx.db.insert('opportunities', {
    userId,
    title: 'Coaching de cadence commerciale',
    type: 'prospect',
    companyId: companyC,
    contactId: contactC,
    source: 'Referral',
    targetType: 'company',
    sourceChannel: 'referral',
    stage: 'interview',
    priority: 'high',
    nextActionAt: '2026-07-04',
    tags: ['Conseil', 'Coach'],
    description: 'Besoin de recommandations actionnables à partir du pipe réel.',
    createdAt: now - 1000 * 60 * 60 * 24 * 4,
    updatedAt: now - 1000 * 60 * 60 * 10,
    order: 30,
  })

  await ctx.db.insert('activities', {
    userId,
    opportunityId: opportunityA,
    kind: 'call',
    content: 'Appel de cadrage effectué, budget confirmé en attente de signature.',
    createdAt: now - 1000 * 60 * 60 * 12,
  })
  await ctx.db.insert('activities', {
    userId,
    opportunityId: opportunityC,
    kind: 'note',
    content: 'La cliente veut des recommandations liées au rythme des relances.',
    createdAt: now - 1000 * 60 * 60 * 9,
  })

  const proposal = await ctx.db.insert('proposals', {
    userId,
    companyId: companyB,
    kind: 'proforma',
    title: 'Accompagnement commercial juillet',
    pitch: 'Structuration du pipeline, relances et reporting hebdomadaire.',
    amount: 350000,
    currency: 'XOF',
    status: 'sent',
    sentAt: '2026-06-28',
    createdAt: now - 1000 * 60 * 60 * 24 * 2,
    updatedAt: now - 1000 * 60 * 60 * 24,
  })

  await ctx.db.insert('proposalRecipients', {
    userId,
    proposalId: proposal,
    targetType: 'company',
    companyId: companyB,
    status: 'sent',
    opportunityId: opportunityB,
    amount: 350000,
    note: 'Proforma en attente de retour sur le périmètre exact.',
    sentAt: now - 1000 * 60 * 60 * 24,
    createdAt: now - 1000 * 60 * 60 * 24 * 2,
    updatedAt: now - 1000 * 60 * 60 * 24,
  })

  await ctx.db.insert('followups', {
    userId,
    opportunityId: opportunityB,
    proposalId: proposal,
    label: 'Relancer sur la proforma',
    dueDate: '2026-07-01',
    done: false,
    createdAt: now - 1000 * 60 * 60 * 16,
  })
  await ctx.db.insert('followups', {
    userId,
    opportunityId: opportunityA,
    label: 'Confirmer la date de signature',
    dueDate: '2026-07-02',
    done: false,
    createdAt: now - 1000 * 60 * 60 * 10,
  })

  await ctx.db.insert('settings', {
    userId,
    currency: 'XOF',
    pipelineStages: [
      'Prospect chaud',
      'Premier contact',
      'Proposition envoyée',
      'Négociation',
      'Gagné',
    ],
    createdAt: now,
    updatedAt: now,
  })

  for (const name of [
    'VIP',
    'Décideur',
    'Prospect chaud',
    'B2B',
    'Immobilier',
    'Conseil',
    'Coach',
    'Referral',
  ]) {
    await ctx.db.insert('tags', {
      userId,
      name,
      createdAt: now,
    })
  }

  await ctx.db.insert('aiMemories', {
    userId,
    scope: 'user',
    category: 'goal',
    key: 'preferred_assistant_tone',
    value: 'Réponses courtes, concrètes, orientées action.',
    source: 'manual',
    confidence: 1,
    createdAt: now,
    updatedAt: now,
  })
  await ctx.db.insert('aiMemories', {
    userId,
    scope: 'user',
    category: 'commercial_posture',
    key: 'sales_focus',
    value: 'Priorité au closing B2B et aux relances structurées.',
    source: 'auto',
    confidence: 0.84,
    createdAt: now,
    updatedAt: now,
  })
  await ctx.db.insert('conversationMemory', {
    userId,
    scope: 'user',
    assistantKind: 'coach',
    summary:
      'Le client veut un copilote orienté vente, qui relance sur la proforma et suit les prospects chauds.',
    keywords: ['pipeline', 'relances', 'proforma', 'vente'],
    embeddingStatus: 'unavailable',
    source: 'chat',
    createdAt: now,
  })

  return {
    seeded: true,
    companies: 3,
    contacts: 3,
    opportunities: 3,
    followups: 2,
    proposals: 1,
  }
}

export const ensureDemoIdentity = internalMutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
    role: v.optional(v.union(v.literal('admin'))),
    plan: v.optional(
      v.union(
        v.literal('free'),
        v.literal('pro'),
        v.literal('pro_ai'),
        v.literal('copilot'),
        v.literal('copilot_max'),
      ),
    ),
    activityType: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<DemoIdentity> => {
    const existing = await findUserByEmail(ctx, args.email)
    if (existing) {
      const patch: Partial<Doc<'users'>> = {}
      if (args.role) patch.role = args.role
      if (args.plan) patch.plan = args.plan
      if (args.activityType) {
        patch.activityType = args.activityType
        patch.stageLabelSet = stageLabelSetForActivity(args.activityType)
      }
      if (!existing.onboardedAt) patch.onboardedAt = Date.now()
      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(existing._id, patch)
      }
      return {
        authId: existing.authId,
        email: args.email,
        password: args.password,
        created: false,
      }
    }

    const auth = createAuth(ctx)
    const result = await auth.api.signUpEmail({
      body: {
        email: args.email,
        password: args.password,
        name: args.name,
        image: '',
      },
    })

    const user = await findUserByEmail(ctx, args.email)
    if (!user) {
      throw new Error(`Compte demo introuvable apres creation: ${args.email}`)
    }

    const patch: Partial<Doc<'users'>> = {
      onboardedAt: Date.now(),
    }
    if (args.role) patch.role = args.role
    if (args.plan) patch.plan = args.plan
    if (args.activityType) {
      patch.activityType = args.activityType
      patch.stageLabelSet = stageLabelSetForActivity(args.activityType)
    }
    await ctx.db.patch(user._id, patch)

    return {
      authId: result.user.id,
      email: args.email,
      password: args.password,
      created: true,
    }
  },
})

export const seedDemoWorkspace = internalMutation({
  args: {
    userId: v.string(),
  },
  handler: (ctx, args) => seedWorkspaceData(ctx, args.userId),
})

export const provisionDemoAccounts = internalMutation({
  args: {
    slug: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    stamp: string
    user: DemoIdentity
    admin: DemoIdentity
    seed: { seeded: boolean; companies: number }
      | {
          seeded: true
          companies: number
          contacts: number
          opportunities: number
          followups: number
          proposals: number
        }
  }> => {
    const stamp =
      args.slug?.trim() ||
      new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 12)
    const userEmail = `demo+${stamp}@filon.test`
    const adminEmail = `demo-agent+${stamp}@filon.test`
    const userPassword = `FilonDemo!${stamp.slice(-6)}`
    const adminPassword = `FilonAgent!${stamp.slice(-6)}`

    const demoUser = await (async (): Promise<DemoIdentity> => {
      const existing = await findUserByEmail(ctx, userEmail)
      if (existing) {
        await ctx.db.patch(existing._id, {
          plan: 'copilot_max',
          activityType: 'consultant',
          stageLabelSet: 'vente',
          onboardedAt: existing.onboardedAt ?? Date.now(),
        })
        return {
          authId: existing.authId,
          email: userEmail,
          password: userPassword,
          created: false,
        }
      }
      const auth = createAuth(ctx)
      const result = await auth.api.signUpEmail({
        body: {
          email: userEmail,
          password: userPassword,
          name: 'Compte démo Filon',
          image: '',
        },
      })
      const user = await findUserByEmail(ctx, userEmail)
      if (!user) {
        throw new Error(`Compte demo introuvable apres creation: ${userEmail}`)
      }
      await ctx.db.patch(user._id, {
        plan: 'copilot_max',
        activityType: 'consultant',
        stageLabelSet: 'vente',
        onboardedAt: Date.now(),
      })
      return {
        authId: result.user.id,
        email: userEmail,
        password: userPassword,
        created: true,
      }
    })()

    const demoAdmin = await (async (): Promise<DemoIdentity> => {
      const existing = await findUserByEmail(ctx, adminEmail)
      if (existing) {
        await ctx.db.patch(existing._id, {
          role: 'admin',
          activityType: 'commercial',
          stageLabelSet: 'vente',
          onboardedAt: existing.onboardedAt ?? Date.now(),
        })
        return {
          authId: existing.authId,
          email: adminEmail,
          password: adminPassword,
          created: false,
        }
      }
      const auth = createAuth(ctx)
      const result = await auth.api.signUpEmail({
        body: {
          email: adminEmail,
          password: adminPassword,
          name: 'Agent démo Filon',
          image: '',
        },
      })
      const user = await findUserByEmail(ctx, adminEmail)
      if (!user) {
        throw new Error(`Compte admin demo introuvable apres creation: ${adminEmail}`)
      }
      await ctx.db.patch(user._id, {
        role: 'admin',
        activityType: 'commercial',
        stageLabelSet: 'vente',
        onboardedAt: Date.now(),
      })
      return {
        authId: result.user.id,
        email: adminEmail,
        password: adminPassword,
        created: true,
      }
    })()

    const seed = await seedWorkspaceData(ctx, demoUser.authId)

    return {
      stamp,
      user: demoUser,
      admin: demoAdmin,
      seed,
    }
  },
})
