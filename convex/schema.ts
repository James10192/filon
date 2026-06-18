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
    // Photo de profil affichee en avatar partout. SOURCE UNIQUE lue par l'UI.
    // Alimentee soit par le provider social (Google `picture` / GitHub
    // `avatar_url`, via le trigger Better Auth), soit par un upload manuel.
    image: v.optional(v.string()),
    // Vrai quand l'utilisateur a importe sa propre photo : empeche le sync
    // social (trigger `user.onUpdate`) d'ecraser une photo choisie a la main.
    customImage: v.optional(v.boolean()),
    // Role applicatif. Absent = utilisateur normal. `admin` = acces au back-office
    // /admin (cross-tenant). L'acces admin peut aussi etre accorde par allowlist
    // d'e-mails (env `ADMIN_EMAILS`) sans ce champ — cf. `requireAdmin`.
    role: v.optional(v.union(v.literal('admin'))),
    // Compte suspendu par un administrateur (back-office /admin). Flag seul pour
    // l'instant : affiché dans la vue 360, l'application effective ailleurs viendra
    // plus tard. Absent = compte actif.
    suspended: v.optional(v.boolean()),
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
    // Référence d'abonnement Paystack (subscription_code en mode natif, ou
    // code de transaction/autorisation en mode manuel). Nom STABLE (lu par
    // admin.userDetail) : ne pas renommer.
    subscriptionRef: v.optional(v.string()),
    // Code client Paystack (customer_code), pour relier les webhooks au user.
    paystackCustomerCode: v.optional(v.string()),
    // --- Souscriptions Paystack natives (additif, rétro-compatible) ---
    // Régime de facturation, choisi par CANAL au checkout :
    //  - 'native'  : paiement CARTE → souscription Paystack récurrente. Paystack
    //    débite, retente et relance (dunning) tout seul ; le cron maison NE
    //    sélectionne JAMAIS ces users.
    //  - 'manual'  : paiement MOBILE MONEY (ou carte legacy) → paiement ponctuel.
    //    Le cron maison (relances + downgrade à l'échéance) pilote CEUX-LÀ.
    // Absent = traité comme 'manual' (les abonnements pré-migration restent
    // pilotés par le cron, zéro régression).
    billingMode: v.optional(
      v.union(v.literal('native'), v.literal('manual')),
    ),
    // email_token Paystack, REQUIS (avec subscriptionRef = subscription_code)
    // pour appeler /subscription/disable et /subscription/enable. Posé par le
    // webhook `subscription.create`. Absent sur les souscriptions natives
    // pré-migration → annulation via le lien hébergé Paystack (manageLink).
    subscriptionEmailToken: v.optional(v.string()),
    // Drapeau informatif (UI) posé après un `invoice.payment_failed` natif :
    // Paystack retente selon sa politique de dunning, on n'a PAS rétrogradé.
    // Effacé au prochain `charge.success` réussi. Purement indicatif.
    nativeDunning: v.optional(v.boolean()),
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
    // --- Onboarding adaptatif (additif) ---
    // Profil d'activite declare a la 1re connexion (ex 'freelance_dev',
    // 'consultant', 'ambassadeur', 'agent_immo', 'agent_assurance',
    // 'recruteur', 'autre'). Libre (string) pour rester flexible/generique :
    // pilote le pre-remplissage des etiquettes et libelles de source.
    activityType: v.optional(v.string()),
    // Horodatage de fin d'onboarding (epoch ms). Absent = onboarding non fait :
    // l'UI affiche l'ecran « quelle est ton activite ? » a la connexion.
    onboardedAt: v.optional(v.number()),
  })
    .index('by_authId', ['authId'])
    .index('by_email', ['email'])
    // Résolution d'un user depuis un webhook par son code client Paystack.
    .index('by_paystackCustomer', ['paystackCustomerCode'])
    // Résolution d'un user depuis un webhook par sa référence d'abonnement
    // (subscription_code natif). Remplace le `collect()` global de
    // cancelSubscription par une lecture indexée (subscription.disable /
    // not_renew arrivent identifiés par subscription_code).
    .index('by_subscriptionRef', ['subscriptionRef'])
    // Le cron d'échéance itère les abonnements payants par date de
    // renouvellement (bornage par `planRenewsAt`, jamais de scan global).
    .index('by_planRenewsAt', ['planRenewsAt']),

  // Cache des Plans Paystack provisionnés (catalogue côté PSP). Une ligne par
  // couple (palier × intervalle) : 6 au total (pro/pro_ai/copilot × mensuel/
  // annuel). Alimenté UNE FOIS par `paystackPlans.ensurePlans` (idempotent) ;
  // tant que cette table est vide, `planCodeFor` renvoie null et le checkout
  // retombe automatiquement sur le paiement ponctuel (sécurité test-mode).
  billingPlans: defineTable({
    // Clé logique stable : `${plan}_${interval}` (ex 'pro_monthly').
    planKey: v.string(),
    plan: v.union(
      v.literal('pro'),
      v.literal('pro_ai'),
      v.literal('copilot'),
    ),
    interval: v.union(v.literal('monthly'), v.literal('annual')),
    // plan_code Paystack (ex 'PLN_xxx'), résolu au runtime par planCodeFor.
    planCode: v.string(),
    // Montant XOF entier (sans la sous-unité ×100), pour audit/diagnostic.
    amountXof: v.number(),
    updatedAt: v.number(),
  }).index('by_planKey', ['planKey']),

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

  // Contacts (interlocuteurs / personnes). Autonomes : rattaches a une entreprise
  // (`companyId`) OU independants (particulier, ex prospect parrainage/MLM). Le
  // carnet de contacts existe donc SANS entreprise (`companyId` optionnel).
  contacts: defineTable({
    userId: v.string(),
    companyId: v.optional(v.id('companies')),
    name: v.string(),
    role: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    notes: v.optional(v.string()),
    // --- Carnet de prospection P2P / parrainage / MLM (additif) ---
    // Comment on connait la personne (relation : « ami », « ancien collegue »).
    relationship: v.optional(v.string()),
    // Lieu (ville/quartier) de la personne.
    location: v.optional(v.string()),
    // Qui a recommande cette personne (nom libre).
    referredBy: v.optional(v.string()),
    // Etiquettes (NOMS, puises dans le catalogue `tags`). Ex « Prospect »,
    // « Leader », « Inactif ». Optionnel : les lignes existantes restent valides.
    tags: v.optional(v.array(v.string())),
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
    // Source d'origine LIBRE (rétro-compat : champ historique, string). Posé par
    // les imports (educarriere, LinkedIn) ou la saisie manuelle. NE PAS le
    // transformer en union (des valeurs arbitraires existent en base).
    source: v.optional(v.string()),
    // --- Cible & origine structurees (additif, modele cible) ---
    // Nature de la cible suivie : entreprise, particulier (contact autonome),
    // ou aucune. Absent = derive cote lecture (companyId -> 'company',
    // contactId -> 'person', sinon 'none').
    targetType: v.optional(
      v.union(
        v.literal('company'),
        v.literal('person'),
        v.literal('none'),
      ),
    ),
    // Canal d'origine NORMALISE (distinct de `source` libre) : alimente les
    // statistiques et le pre-remplissage onboarding. `sourceDetail` porte la
    // note libre associee (ex « Salon SARA 2026 », « recommande par Awa »).
    sourceChannel: v.optional(
      v.union(
        v.literal('job_board'),
        v.literal('referral'),
        v.literal('event'),
        v.literal('networking'),
        v.literal('salon'),
        v.literal('social'),
        v.literal('inbound'),
        v.literal('cold'),
        v.literal('other'),
      ),
    ),
    sourceDetail: v.optional(v.string()),
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
    .index('by_user_contact', ['userId', 'contactId'])
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

  // Catalogue d'etiquettes par utilisateur. SOURCE du select/combobox
  // d'etiquettes (avec creation inline). Les opportunites/contacts ne stockent
  // QUE les NOMS dans leur array `tags` ; ce catalogue porte la couleur et evite
  // le texte libre divergent. Unicite logique (userId, name) garantie par le
  // code (createTag idempotent) ; l'index `by_user_name` sert la resolution.
  tags: defineTable({
    userId: v.string(),
    name: v.string(),
    color: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_name', ['userId', 'name']),

  // Destinataires d'une PROPOSITION (offre reutilisable adressee a PLUSIEURS
  // cibles). Une ligne par couple (proposition × destinataire), chacun suivi
  // individuellement (statut envoye/accepte/refuse), eventuellement relie a une
  // opportunite du pipeline. Le destinataire est soit une entreprise, soit une
  // personne (contact). Retro-compat : `proposals.companyId` reste, le multi-cible
  // passe par cette table.
  proposalRecipients: defineTable({
    userId: v.string(),
    proposalId: v.id('proposals'),
    targetType: v.union(v.literal('company'), v.literal('person')),
    companyId: v.optional(v.id('companies')),
    contactId: v.optional(v.id('contacts')),
    status: v.union(
      v.literal('pending'),
      v.literal('sent'),
      v.literal('accepted'),
      v.literal('refused'),
    ),
    opportunityId: v.optional(v.id('opportunities')),
    amount: v.optional(v.number()),
    note: v.optional(v.string()),
    sentAt: v.optional(v.number()),
    respondedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_proposal', ['proposalId'])
    .index('by_user_status', ['userId', 'status']),

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
    // Mots-clés à INCLURE, normalisés (trim, lowercase, dédupliqués). Conservé
    // sous le nom `keywords` pour rétro-compat ; sémantiquement = inclusions.
    keywords: v.array(v.string()),
    enabled: v.boolean(),
    // --- Enrichissement Radar (tout optionnel : lignes existantes valides) ---
    // Nom lisible de la veille (à défaut, dérivé des mots-clés).
    name: v.optional(v.string()),
    // Intention : postuler, démarcher (prospection), ou les deux. Pilote le
    // type/les tags de l'opportunité créée et le cadrage de l'analyse IA.
    intent: v.optional(
      v.union(v.literal('apply'), v.literal('prospect'), v.literal('both')),
    ),
    // Mots-clés à EXCLURE (ex: « stage », « alternance »).
    excludeKeywords: v.optional(v.array(v.string())),
    // Connecteurs ciblés (ids). Absent/vide = toutes les sources auto.
    sources: v.optional(v.array(v.string())),
    // Filtre localisation libre normalisé ('all' = partout).
    location: v.optional(v.string()),
    // Notifier (cloche) quand cette veille importe de nouvelles offres.
    notify: v.optional(v.boolean()),
    lastRunAt: v.optional(v.number()),
    lastMatchCount: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    // Le cron itère les recherches actives, tous users confondus.
    .index('by_enabled', ['enabled']),

  // Santé des connecteurs de veille (données SYSTÈME, pas de userId). Une ligne
  // par connecteur, mise à jour à chaque passage du moniteur : permet d'afficher
  // « educarriere opérationnel · SIGMAP en panne » au lieu d'un échec muet.
  veilleSourceHealth: defineTable({
    connectorId: v.string(),
    ok: v.boolean(),
    lastRunAt: v.number(),
    lastOkAt: v.optional(v.number()),
    lastError: v.optional(v.string()),
    // Nombre d'offres listées au dernier passage réussi (santé du parsing).
    lastCount: v.optional(v.number()),
    updatedAt: v.number(),
  }).index('by_connector', ['connectorId']),

  // Analyse IA d'un signal détecté (Phase IA « à l'acte »). Mise en cache par
  // opportunité pour ne JAMAIS re-débiter une analyse déjà payée. `draft` est
  // généré à la demande (second acte facturé), d'où son caractère optionnel.
  aiSignals: defineTable({
    userId: v.string(),
    opportunityId: v.id('opportunities'),
    // Pertinence 0-100 vs l'intention/les mots-clés de la veille.
    score: v.number(),
    suggestedAction: v.union(
      v.literal('apply'),
      v.literal('prospect'),
      v.literal('ignore'),
    ),
    rationale: v.string(),
    // Brouillon du 1er message (candidature ou démarchage), à la demande.
    draft: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_opportunity', ['opportunityId'])
    .index('by_user', ['userId']),

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
      // Le radar a importé de nouvelles offres pour une veille.
      v.literal('veille_import'),
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
    // Lecture cross-tenant des métriques admin (somme des crédits du mois).
    .index('by_created', ['createdAt'])
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

  // Feedback in-app (widget). Scope `userId` cote soumission (requireUser) ;
  // lecture cross-tenant reservee au back-office /admin (requireAdmin).
  // `context` = chemin de la page d'ou le feedback a ete envoye (debug). Le cycle
  // de traitement va de `new` -> `in_progress` -> `done`, avec une note interne.
  feedback: defineTable({
    userId: v.string(),
    type: v.union(v.literal('bug'), v.literal('idea'), v.literal('other')),
    message: v.string(),
    context: v.optional(v.string()),
    status: v.union(
      v.literal('new'),
      v.literal('in_progress'),
      v.literal('done'),
    ),
    adminNote: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_status', ['status'])
    .index('by_created', ['createdAt'])
    .index('by_status_created', ['status', 'createdAt']),
})
