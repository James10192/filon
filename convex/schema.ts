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
    // --- Abonnement (Phase 2, additif) ---
    // Tous ces champs sont optionnels : les lignes existantes restent valides.
    // L'absence de `plan` est traitée comme 'free' par le helper de gating.
    plan: v.optional(
      v.union(
        v.literal('free'),
        v.literal('pro'),
        v.literal('pro_ai'),
        v.literal('copilot'),
      ),
    ),
    planInterval: v.optional(
      v.union(v.literal('monthly'), v.literal('annual')),
    ),
    // Échéance de renouvellement / fin de période payée (epoch ms).
    planRenewsAt: v.optional(v.number()),
    // Référence d'abonnement Paystack (subscription_code) ou de transaction.
    subscriptionRef: v.optional(v.string()),
    // Code client Paystack (customer_code), pour relier les webhooks au user.
    paystackCustomerCode: v.optional(v.string()),
    // --- Cycle de vie d'abonnement (Phase 2, additif) ---
    // Renouvellement automatique. Absent = traité comme `true` (les abonnements
    // existants restent en renouvellement). Mis à `false` par `cancelAutoRenew`.
    autoRenew: v.optional(v.boolean()),
    // Palier programmé, appliqué à l'échéance (`planRenewsAt`) par le cron :
    // soit un downgrade choisi (ex 'pro'), soit 'free' (annulation). Effacé une
    // fois appliqué, ou par un upgrade / une réactivation.
    pendingPlan: v.optional(
      v.union(
        v.literal('free'),
        v.literal('pro'),
        v.literal('pro_ai'),
        v.literal('copilot'),
      ),
    ),
    // Horodatage de la dernière relance d'échéance envoyée/flaggée (epoch ms),
    // pour ne pas relancer en boucle. Posé par le cron de rappel.
    renewalReminderAt: v.optional(v.number()),
    // --- Renouvellement carte (Axe 2, additif) ---
    // En XOF/Côte d'Ivoire, SEULE la carte donne une autorisation réutilisable :
    // le mobile money (Wave/Orange/MTN) est un paiement ponctuel sans mandat. On
    // ne stocke ces champs QUE pour un paiement carte dont `authorization.reusable`
    // est vrai. Ils alimentent l'auto-débit silencieux du cron de renouvellement.
    // Code d'autorisation réutilisable Paystack (POST /charge/authorization).
    cardAuthCode: v.optional(v.string()),
    // 4 derniers chiffres de la carte (affichage « Visa ···· 4242 »).
    cardLast4: v.optional(v.string()),
    // Banque émettrice et marque (visa/mastercard), pour l'affichage.
    cardBank: v.optional(v.string()),
    cardBrand: v.optional(v.string()),
    // Nombre de tentatives d'auto-débit pour la période courante (cap à 2). Remis
    // à zéro par un paiement réussi (applySubscription) ou un changement de période.
    renewalAttempts: v.optional(v.number()),
    // Horodatage de la dernière tentative d'auto-débit (epoch ms), pour espacer
    // les retries et éviter de re-tenter le même jour.
    lastChargeAttemptAt: v.optional(v.number()),
  })
    .index('by_authId', ['authId'])
    .index('by_email', ['email'])
    // Résolution d'un user depuis un webhook par son code client Paystack.
    .index('by_paystackCustomer', ['paystackCustomerCode'])
    // Le cron d'échéance itère les abonnements payants par date de
    // renouvellement (bornage par `planRenewsAt`, jamais de scan global).
    .index('by_planRenewsAt', ['planRenewsAt']),

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
    .index('by_user_name', ['userId', 'name'])
    // Recherche plein texte de la palette de commandes (scopee par user).
    .searchIndex('search_name', {
      searchField: 'name',
      filterFields: ['userId'],
    }),

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
    .index('by_contact', ['contactId'])
    // Recherche plein texte de la palette de commandes (scopee par user).
    .searchIndex('search_title', {
      searchField: 'title',
      filterFields: ['userId'],
    }),

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
    .index('by_company', ['companyId'])
    // Recherche plein texte de la palette de commandes (scopee par user).
    .searchIndex('search_title', {
      searchField: 'title',
      filterFields: ['userId'],
    }),

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

  // Notifications in-app (Axe 2, additif). Scope strict `userId`. Aujourd'hui
  // alimentées par le cycle de renouvellement (relance d'échéance, échec de
  // débit, downgrade). `kind` qualifie l'événement ; `emailSent` flag le relais
  // e-mail (Resend optionnel) pour ne pas ré-envoyer. `meta` porte les détails
  // sérialisés (plan, montant, échéance) consommés par l'UI/encart.
  notifications: defineTable({
    userId: v.string(),
    kind: v.union(
      v.literal('renewal_reminder'),
      v.literal('renewal_charged'),
      v.literal('renewal_failed'),
      v.literal('downgraded'),
    ),
    title: v.string(),
    body: v.string(),
    // CTA optionnel (lien de renouvellement pré-rempli, page Tarifs, etc.).
    actionUrl: v.optional(v.string()),
    // Métadonnées sérialisées (JSON string) : plan, intervalle, échéance...
    meta: v.optional(v.string()),
    read: v.boolean(),
    // Relais e-mail effectué (true) ou en attente d'un provider (false). Le
    // contenu reste consultable in-app quoi qu'il arrive (email = bonus).
    emailSent: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_created', ['userId', 'createdAt'])
    .index('by_user_read', ['userId', 'read']),

  // --- Copilot IA (Phase IA, additif) ---
  // Solde de crédits IA d'un user (1 ligne par user). `balance` = allocation
  // mensuelle restante (remise à `monthlyAllowance` par le cron mensuel) ;
  // `packBalance` = crédits achetés à la carte (packs Paystack), non remis à
  // zéro. La consommation pioche d'abord dans `balance`, puis dans `packBalance`.
  aiCredits: defineTable({
    userId: v.string(),
    balance: v.number(),
    monthlyAllowance: v.number(),
    periodStart: v.number(),
    packBalance: v.number(),
    updatedAt: v.number(),
  }).index('by_user', ['userId']),

  // Journal de consommation IA (1 ligne par échange/onFinish), pour l'historique
  // d'usage et la facturation. Scope strict `userId`.
  aiUsage: defineTable({
    userId: v.string(),
    threadId: v.string(),
    model: v.string(),
    mode: v.union(v.literal('fast'), v.literal('quality')),
    inputTokens: v.number(),
    outputTokens: v.number(),
    costUsd: v.optional(v.number()),
    creditsDebited: v.number(),
    toolsUsed: v.array(v.string()),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_created', ['userId', 'createdAt'])
    .index('by_thread', ['threadId']),

  // Préférences de permission du copilote (1 ligne par user). `mode` pilote le
  // niveau d'autonomie des outils d'écriture ; `alwaysAllow` mémorise les outils
  // que l'utilisateur a explicitement autorisés « toujours ».
  aiPermissionPrefs: defineTable({
    userId: v.string(),
    mode: v.union(
      v.literal('ask'),
      v.literal('accept'),
      v.literal('auto'),
      v.literal('bypass'),
    ),
    alwaysAllow: v.array(v.string()),
    updatedAt: v.number(),
  }).index('by_user', ['userId']),

  // Miroir applicatif des fils de conversation du copilote. Le composant Agent
  // gère les messages ; on mémorise ici la liste pour l'historique (titre, date
  // du dernier message) scopé `userId`.
  aiThreads: defineTable({
    userId: v.string(),
    threadId: v.string(),
    title: v.optional(v.string()),
    lastMessageAt: v.number(),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_last', ['userId', 'lastMessageAt'])
    .index('by_threadId', ['threadId']),

  // Journal des actions exécutées par le copilote (écritures). Donne l'audit
  // cross-thread, le lien vers l'entité touchée, et la base d'une annulation
  // future. `entityType`/`entityId` pointent l'objet créé/modifié.
  aiActions: defineTable({
    userId: v.string(),
    threadId: v.optional(v.string()),
    tool: v.string(),
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    summary: v.string(),
    createdAt: v.number(),
  })
    .index('by_user_created', ['userId', 'createdAt'])
    .index('by_thread', ['threadId']),
})
