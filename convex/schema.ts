import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

/**
 * Filon · modèle de données.
 *
 * Multi-tenant strict : chaque table métier porte `userId` (l'identifiant
 * Better Auth de l'utilisateur courant, une string). Chaque query/mutation doit
 * passer par le helper `withUser(ctx)` et scoper via un index `by_user*`.
 * Jamais de scan global.
 */
export default defineSchema({
  // Profil applicatif. Alimenté par le trigger Better Auth `user.onCreate`.
  // `authId` = identifiant Better Auth, c'est aussi la valeur de `userId`
  // utilisée pour scoper toutes les autres tables.
  users: defineTable({
    authId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    headline: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_authId', ['authId'])
    .index('by_email', ['email']),

  // Entreprises ciblées (employeurs, clients potentiels).
  companies: defineTable({
    userId: v.string(),
    name: v.string(),
    website: v.optional(v.string()),
    sector: v.optional(v.string()),
    location: v.optional(v.string()),
    source: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_created', ['userId', 'createdAt'])
    .index('by_user_name', ['userId', 'name']),

  // Contacts (interlocuteurs), éventuellement rattachés à une entreprise.
  contacts: defineTable({
    userId: v.string(),
    companyId: v.optional(v.id('companies')),
    name: v.string(),
    role: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_created', ['userId', 'createdAt'])
    .index('by_user_company', ['userId', 'companyId']),

  // Coeur du produit : opportunités dans le pipeline kanban.
  opportunities: defineTable({
    userId: v.string(),
    title: v.string(),
    type: v.union(
      v.literal('job_offer'),
      v.literal('spontaneous'),
      v.literal('prospect'),
      v.literal('mission'),
    ),
    companyId: v.optional(v.id('companies')),
    contactId: v.optional(v.id('contacts')),
    source: v.optional(v.string()),
    url: v.optional(v.string()),
    location: v.optional(v.string()),
    // Compensation libre, ex: "remote · 800k XOF/mois".
    compensation: v.optional(v.string()),
    stage: v.union(
      v.literal('lead'),
      v.literal('contacted'),
      v.literal('applied'),
      v.literal('interview'),
      v.literal('negotiation'),
      v.literal('won'),
      v.literal('lost'),
    ),
    priority: v.union(
      v.literal('low'),
      v.literal('medium'),
      v.literal('high'),
    ),
    deadline: v.optional(v.string()),
    appliedAt: v.optional(v.string()),
    nextActionAt: v.optional(v.string()),
    tags: v.array(v.string()),
    description: v.optional(v.string()),
    // Traçabilité d'import (veille educarriere, LinkedIn, saisie manuelle).
    // Champs additifs : les lignes existantes restent valides.
    importSource: v.optional(
      v.union(
        v.literal('educarriere'),
        v.literal('linkedin'),
        v.literal('autre'),
        v.literal('manuel'),
      ),
    ),
    // URL canonique de l'offre, utilisée pour la déduplication (distincte de
    // `url`, qui reste librement éditable par le user).
    sourceUrl: v.optional(v.string()),
    importedAt: v.optional(v.number()),
    // Position dans la colonne kanban (tri intra-stage).
    order: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_stage', ['userId', 'stage'])
    .index('by_user_stage_order', ['userId', 'stage', 'order'])
    .index('by_user_type', ['userId', 'type'])
    .index('by_user_created', ['userId', 'createdAt'])
    .index('by_user_next_action', ['userId', 'nextActionAt'])
    // Déduplication des imports : (userId, sourceUrl).
    .index('by_user_sourceUrl', ['userId', 'sourceUrl'])
    .index('by_company', ['companyId'])
    .index('by_contact', ['contactId']),

  // Timeline d'activités rattachée à une opportunité.
  activities: defineTable({
    userId: v.string(),
    opportunityId: v.id('opportunities'),
    kind: v.union(
      v.literal('note'),
      v.literal('email'),
      v.literal('call'),
      v.literal('interview'),
      v.literal('status_change'),
      v.literal('other'),
    ),
    content: v.string(),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_opportunity', ['opportunityId'])
    .index('by_user_opportunity', ['userId', 'opportunityId'])
    .index('by_user_created', ['userId', 'createdAt']),

  // Relances datées, éventuellement liées à une opportunité ou une proposition.
  followups: defineTable({
    userId: v.string(),
    opportunityId: v.optional(v.id('opportunities')),
    proposalId: v.optional(v.id('proposals')),
    label: v.string(),
    dueDate: v.string(),
    done: v.boolean(),
    doneAt: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_done', ['userId', 'done'])
    .index('by_user_due', ['userId', 'dueDate'])
    .index('by_user_done_due', ['userId', 'done', 'dueDate'])
    .index('by_opportunity', ['opportunityId'])
    .index('by_proposal', ['proposalId']),

  // Propositions spontanées / démarchage.
  proposals: defineTable({
    userId: v.string(),
    companyId: v.optional(v.id('companies')),
    title: v.string(),
    pitch: v.string(),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    status: v.union(
      v.literal('draft'),
      v.literal('sent'),
      v.literal('accepted'),
      v.literal('refused'),
    ),
    sentAt: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_status', ['userId', 'status'])
    .index('by_user_created', ['userId', 'createdAt'])
    .index('by_company', ['companyId']),

  // Bibliothèque de documents (CV, lettres, etc.) via Convex storage.
  documents: defineTable({
    userId: v.string(),
    name: v.string(),
    kind: v.union(
      v.literal('cv'),
      v.literal('lettre'),
      v.literal('portfolio'),
      v.literal('contrat'),
      v.literal('autre'),
    ),
    storageId: v.id('_storage'),
    opportunityId: v.optional(v.id('opportunities')),
    size: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_kind', ['userId', 'kind'])
    .index('by_user_created', ['userId', 'createdAt'])
    .index('by_opportunity', ['opportunityId']),

  // Préférences utilisateur (1 ligne par user).
  settings: defineTable({
    userId: v.string(),
    pipelineStages: v.optional(v.array(v.string())),
    currency: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_user', ['userId']),

  // Recherches enregistrées : mots-clés surveillés par le moniteur educarriere.
  // 1..N par user. Le cron scanne les recherches `enabled` de tous les users.
  savedSearches: defineTable({
    userId: v.string(),
    // Mots-clés normalisés (trim, lowercase, dédupliqués).
    keywords: v.array(v.string()),
    enabled: v.boolean(),
    lastRunAt: v.optional(v.number()),
    lastMatchCount: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    // Le cron itère les recherches actives, tous users confondus.
    .index('by_enabled', ['enabled']),
})
