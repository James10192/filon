import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { assistantKindValidator } from './lib/assistant'

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
        v.literal('copilot_max'),
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
        v.literal('copilot_max'),
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
    // Jeu d'etiquettes de pipeline a afficher (persona-aware). Derive de
    // `activityType` au moment de l'onboarding. N'altere PAS les cles internes
    // du pipeline (lead, contacted...) : seul l'affichage des libelles change.
    // Absent = 'emploi' (libelles par defaut, orientes recherche d'emploi).
    stageLabelSet: v.optional(
      v.union(
        v.literal('emploi'),
        v.literal('vente'),
        v.literal('recrutement'),
      ),
    ),
    // Horodatage de fin d'onboarding (epoch ms). Absent = onboarding non fait :
    // l'UI affiche l'ecran « quelle est ton activite ? » a la connexion.
    onboardedAt: v.optional(v.number()),
    // --- BYOK : « apportez votre propre clé » (perk Copilot / Copilot Max) ---
    // Un utilisateur d'un palier Copilot peut fournir sa propre clé API
    // OpenRouter. Ses appels au copilote passent alors par SA clé (il paie son
    // fournisseur directement) : on ne pré-contrôle pas son solde de crédits et
    // on ne débite RIEN. La clé est chiffrée au repos (AES-256-GCM, cf.
    // `lib/crypto.ts`) ; on ne stocke JAMAIS la clé en clair et on ne la renvoie
    // JAMAIS au client (seul `byokKeyLast4`, non sensible, sert à l'affichage).
    byokProvider: v.optional(v.literal('openrouter')),
    byokKeyCiphertext: v.optional(v.string()),
    byokKeyLast4: v.optional(v.string()),
    byokKeyAddedAt: v.optional(v.number()),
    // --- Parrainage / affiliation (additif) ---
    // Code de parrainage UNIQUE de l'utilisateur (genere a la demande, ex 'AX7K2P').
    // Partage dans un lien `?ref=CODE`. Absent tant que l'utilisateur n'a pas
    // ouvert sa page Parrainage (genere paresseusement). Index `by_referralCode`.
    referralCode: v.optional(v.string()),
    // Code du parrain qui a amene cet utilisateur (pose UNE seule fois a
    // l'inscription via `claimReferral`, immuable ensuite). Absent = arrivee directe.
    referredByCode: v.optional(v.string()),
    // authId du parrain, resolu depuis `referredByCode` a la liaison (denormalise
    // pour scoper/crediter les recompenses sans relire le code a chaque fois).
    referredByUserId: v.optional(v.string()),
  })
    .index('by_authId', ['authId'])
    .index('by_email', ['email'])
    // Resolution d'un parrain depuis son code (`claimReferral`, lien `?ref=`).
    .index('by_referralCode', ['referralCode'])
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
  // couple (palier × intervalle) : 8 au total (pro/pro_ai/copilot/copilot_max ×
  // mensuel/annuel). Alimenté UNE FOIS par `paystackPlans.ensurePlans` (idempotent) ;
  // tant que cette table est vide, `planCodeFor` renvoie null et le checkout
  // retombe automatiquement sur le paiement ponctuel (sécurité test-mode).
  billingPlans: defineTable({
    // Clé logique stable : `${plan}_${interval}` (ex 'pro_monthly').
    planKey: v.string(),
    plan: v.union(
      v.literal('pro'),
      v.literal('pro_ai'),
      v.literal('copilot'),
      v.literal('copilot_max'),
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
    // --- Reseau / marketing relationnel (wedge MLM, additif) ---
    // Statut de relation d'un FILLEUL (membre du reseau, distinct du parrainage
    // produit Filon). Absent = simple contact/prospect, pas un filleul suivi.
    // 'active' = cotise/achete ; 'at_risk' = en train de decrocher ; 'inactive'
    // = a arrete. Ce qui rend un contact visible dans le segment « Filleuls ».
    mlmStatus: v.optional(
      v.union(
        v.literal('prospect'),
        v.literal('active'),
        v.literal('at_risk'),
        v.literal('inactive'),
      ),
    ),
    // Horodatage du dernier changement de `mlmStatus` (epoch ms) : date le churn.
    mlmStatusAt: v.optional(v.number()),
    // Parrain DIRECT dans le reseau (arbre downline). Reference un autre contact
    // de l'utilisateur. Absent = filleul de niveau 1 (rattache a l'utilisateur).
    parentContactId: v.optional(v.id('contacts')),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_created', ['userId', 'createdAt'])
    .index('by_user_company', ['userId', 'companyId'])
    // Segment « Filleuls » du carnet (contacts ayant un statut reseau).
    .index('by_user_mlmStatus', ['userId', 'mlmStatus'])
    // Arbre downline : enfants d'un parrain donne.
    .index('by_user_parent', ['userId', 'parentContactId']),

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
    // --- Pointage de priorité par le head sell (équipe, additif) ---
    // Un manager (head sell/admin d'une org dont le propriétaire est membre actif)
    // « pointe » l'opportunité comme prioritaire. C'est une ÉTIQUETTE structurée,
    // ORTHOGONALE à `priority` (le jugement du propriétaire reste intact) et SANS
    // pollution du catalogue `tags`. `flaggedByName` est dénormalisé pour
    // l'affichage/la notification (évite une lecture du profil au rendu).
    flaggedPriority: v.optional(v.boolean()),
    flaggedBy: v.optional(v.string()),
    flaggedByName: v.optional(v.string()),
    flaggedAt: v.optional(v.number()),
    flaggedNote: v.optional(v.string()),
    // --- Recouvrement MailPulse (additif) ---
    // Filon garde le suivi metier, MailPulse garde les envois email/WhatsApp.
    recoveryStatus: v.optional(
      v.union(
        v.literal('not_started'),
        v.literal('prompted'),
        v.literal('manual_followup'),
        v.literal('mailpulse_pending'),
        v.literal('mailpulse_active'),
        v.literal('paid'),
        v.literal('cancelled'),
      ),
    ),
    recoveryPromptedAt: v.optional(v.number()),
    recoveryFollowupId: v.optional(v.id('followups')),
    mailpulseContactId: v.optional(v.string()),
    mailpulseSequenceId: v.optional(v.string()),
    mailpulseLastSyncAt: v.optional(v.number()),
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
    // Vue focalisée du commercial : ses opportunités pointées prioritaires par
    // son head sell (scopée user, bornée sur le flag).
    .index('by_user_flagged', ['userId', 'flaggedPriority'])
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
    kind: v.optional(v.union(v.literal('proposal'), v.literal('proforma'))),
    title: v.string(),
    pitch: v.string(),
    lineItems: v.optional(
      v.array(
        v.object({
          label: v.string(),
          description: v.optional(v.string()),
          quantity: v.number(),
          unitPrice: v.number(),
        }),
      ),
    ),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    validUntil: v.optional(v.string()),
    terms: v.optional(v.string()),
    clientNote: v.optional(v.string()),
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

  // Liaisons document <-> entite (Documents 360, additif). Un document peut etre
  // rattache a N'IMPORTE QUELLE entite (opportunite, proposition, contact,
  // entreprise) via une table de jointure many-to-many. Le rattachement legacy
  // `documents.opportunityId` reste intact (retro-compat) ; ce modele le complete
  // sans le remplacer. Unicite logique (documentId, entityType, entityId)
  // garantie par le code (attachToEntity idempotent). Scope strict `userId`.
  documentLinks: defineTable({
    userId: v.string(),
    documentId: v.id('documents'),
    entityType: v.union(
      v.literal('opportunity'),
      v.literal('proposal'),
      v.literal('contact'),
      v.literal('company'),
    ),
    // Id de l'entite cible, stocke en string (polymorphe : la table varie selon
    // `entityType`). La propriete est verifiee au moment du lien.
    entityId: v.string(),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_document', ['documentId'])
    .index('by_entity', ['entityType', 'entityId']),

  // Préférences utilisateur (1 ligne par user).
  settings: defineTable({
    userId: v.string(),
    pipelineStages: v.optional(v.array(v.string())),
    currency: v.optional(v.string()),
    // --- Objectif de palier (wedge MLM, additif) ---
    // Le rang cible declare par l'ambassadeur (ex « Manager ») et son exigence en
    // nombre de filleuls actifs. Filon NE recopie AUCUN chiffre de l'entreprise :
    // la progression est DERIVEE du pipeline/reseau de l'utilisateur. Absent =
    // pas d'objectif fixe (la carte propose d'en definir un).
    rankGoalLabel: v.optional(v.string()),
    rankGoalTargetActives: v.optional(v.number()),
    // --- MailPulse & recouvrement (additif) ---
    mailpulsePromptOnWon: v.optional(v.boolean()),
    mailpulseConnectionStatus: v.optional(
      v.union(
        v.literal('not_linked'),
        v.literal('pending'),
        v.literal('linked'),
      ),
    ),
    mailpulseAccountId: v.optional(v.string()),
    mailpulseWorkspaceId: v.optional(v.string()),
    recoveryReminderDelayDays: v.optional(v.number()),
    recoveryFallbackFollowupEnabled: v.optional(v.boolean()),
    recoveryPreferredChannels: v.optional(
      v.array(v.union(v.literal('email'), v.literal('whatsapp'))),
    ),
    recoveryMode: v.optional(
      v.union(
        v.literal('manual'),
        v.literal('semi_auto'),
        v.literal('automatic'),
      ),
    ),
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
      // --- Équipe (additif) ---
      // Le head sell a pointé une opportunité comme prioritaire pour le membre.
      v.literal('priority_flagged'),
      // Invitation reçue à rejoindre une organisation.
      v.literal('org_invite'),
      // Une invitation envoyée a été acceptée (notifie l'admin).
      v.literal('invite_accepted'),
      // Le membre a été retiré d'une organisation.
      v.literal('member_removed'),
      // Un feedback de l'utilisateur a été traité.
      v.literal('feedback_resolved'),
      // Une mise à jour produit publiée par l'équipe.
      v.literal('product_update'),
    ),
    title: v.string(),
    body: v.string(),
    // CTA optionnel (lien de renouvellement pré-rempli, page Tarifs, etc.).
    actionUrl: v.optional(v.string()),
    actionLabel: v.optional(v.string()),
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
    assistantKind: v.optional(assistantKindValidator),
    title: v.optional(v.string()),
    lastMessageAt: v.number(),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_kind_last', ['userId', 'assistantKind', 'lastMessageAt'])
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

  // Journal d'exécution et de diagnostic du copilote. Complète `aiActions`
  // avec les étapes NON métier : message lancé, message échoué, tool en erreur,
  // approbation refusée, etc. Sert à l'observabilité et au back-office.
  aiEvents: defineTable({
    userId: v.string(),
    threadId: v.optional(v.string()),
    assistantKind: v.optional(assistantKindValidator),
    type: v.string(),
    level: v.union(
      v.literal('info'),
      v.literal('warning'),
      v.literal('error'),
    ),
    message: v.string(),
    tool: v.optional(v.string()),
    model: v.optional(v.string()),
    mode: v.optional(v.union(v.literal('fast'), v.literal('quality'))),
    metadata: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_user_created', ['userId', 'createdAt'])
    .index('by_user_kind_created', ['userId', 'assistantKind', 'createdAt'])
    .index('by_level_created', ['level', 'createdAt'])
    .index('by_thread', ['threadId']),

  aiResponseRatings: defineTable({
    userId: v.string(),
    threadId: v.string(),
    assistantKind: assistantKindValidator,
    messageKey: v.string(),
    rating: v.union(v.literal('up'), v.literal('down')),
    comment: v.optional(v.string()),
    escalatedToSupport: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index('by_user_created', ['userId', 'createdAt'])
    .index('by_thread', ['threadId'])
    .index('by_thread_message', ['threadId', 'messageKey']),

  // Journal d'erreurs applicatives persistantes. Capte les erreurs client
  // importantes (toast + contexte) et les erreurs serveur métier / intégrations
  // pour reconstruire un incident sans dépendre uniquement des logs volatils.
  appErrors: defineTable({
    userId: v.optional(v.string()),
    source: v.union(v.literal('client'), v.literal('server')),
    feature: v.string(),
    action: v.string(),
    message: v.string(),
    level: v.union(
      v.literal('info'),
      v.literal('warning'),
      v.literal('error'),
    ),
    route: v.optional(v.string()),
    metadata: v.optional(v.string()),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index('by_created', ['createdAt'])
    .index('by_level_created', ['level', 'createdAt'])
    .index('by_feature_created', ['feature', 'createdAt'])
    .index('by_user_created', ['userId', 'createdAt']),

  // Feedback in-app (widget). Scope `userId` cote soumission (requireUser) ;
  // lecture cross-tenant reservee au back-office /admin (requireAdmin).
  // `context` = chemin de la page d'ou le feedback a ete envoye (debug). Le cycle
  // de traitement va de `new` -> `in_progress` -> `done`, avec une note interne.
  feedback: defineTable({
    userId: v.string(),
    type: v.union(v.literal('bug'), v.literal('idea'), v.literal('other')),
    message: v.string(),
    context: v.optional(v.string()),
    pageTitle: v.optional(v.string()),
    browser: v.optional(v.string()),
    viewport: v.optional(v.string()),
    userPlan: v.optional(v.string()),
    organizationId: v.optional(v.string()),
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    priority: v.optional(
      v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
    ),
    screenshotUrl: v.optional(v.string()),
    canContactBack: v.optional(v.boolean()),
    status: v.union(
      v.literal('new'),
      v.literal('in_progress'),
      v.literal('done'),
    ),
    adminNote: v.optional(v.string()),
    customerNote: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_status', ['status'])
    .index('by_created', ['createdAt'])
    .index('by_status_created', ['status', 'createdAt']),

  supportThreads: defineTable({
    userId: v.string(),
    aiThreadId: v.optional(v.string()),
    feedbackId: v.optional(v.id('feedback')),
    assistantKind: assistantKindValidator,
    status: v.union(
      v.literal('pending'),
      v.literal('active'),
      v.literal('released'),
      v.literal('dismissed'),
    ),
    priority: v.union(
      v.literal('low'),
      v.literal('medium'),
      v.literal('high'),
    ),
    category: v.optional(v.string()),
    requestedReason: v.optional(v.string()),
    assignedAgentId: v.optional(v.string()),
    assignedAgentName: v.optional(v.string()),
    lastUserMessageAt: v.optional(v.number()),
    lastAgentMessageAt: v.optional(v.number()),
    lastActivityAt: v.number(),
    requestedAt: v.number(),
    takenOverAt: v.optional(v.number()),
    releasedAt: v.optional(v.number()),
  })
    .index('by_user_requested', ['userId', 'requestedAt'])
    .index('by_user_thread', ['userId', 'aiThreadId'])
    .index('by_status_requested', ['status', 'requestedAt'])
    .index('by_assigned_status', ['assignedAgentId', 'status'])
    .index('by_ai_thread', ['aiThreadId']),

  supportMessages: defineTable({
    userId: v.string(),
    supportThreadId: v.id('supportThreads'),
    aiThreadId: v.optional(v.string()),
    role: v.union(
      v.literal('user'),
      v.literal('agent'),
      v.literal('system'),
    ),
    via: v.union(v.literal('ai'), v.literal('human')),
    body: v.string(),
    actorUserId: v.optional(v.string()),
    actorName: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_supportThread', ['supportThreadId'])
    .index('by_user_created', ['userId', 'createdAt'])
    .index('by_ai_thread', ['aiThreadId']),

  supportPresence: defineTable({
    supportThreadId: v.id('supportThreads'),
    agentUserId: v.string(),
    lastSeenAt: v.number(),
  })
    .index('by_support_agent', ['supportThreadId', 'agentUserId'])
    .index('by_agent_seen', ['agentUserId', 'lastSeenAt']),

  aiMemories: defineTable({
    userId: v.string(),
    organizationId: v.optional(v.string()),
    assistantKind: v.optional(assistantKindValidator),
    scope: v.union(v.literal('user'), v.literal('organization')),
    category: v.union(
      v.literal('preference'),
      v.literal('activity'),
      v.literal('goal'),
      v.literal('organization'),
      v.literal('commercial_posture'),
      v.literal('support_signal'),
    ),
    key: v.string(),
    value: v.string(),
    source: v.union(v.literal('manual'), v.literal('auto')),
    confidence: v.optional(v.number()),
    updatedAt: v.number(),
    createdAt: v.number(),
  })
    .index('by_user_scope', ['userId', 'scope'])
    .index('by_user_key', ['userId', 'key'])
    .index('by_org_scope', ['organizationId', 'scope']),

  conversationMemory: defineTable({
    userId: v.string(),
    organizationId: v.optional(v.string()),
    threadId: v.optional(v.string()),
    assistantKind: assistantKindValidator,
    scope: v.union(v.literal('user'), v.literal('organization')),
    summary: v.string(),
    keywords: v.array(v.string()),
    embeddingStatus: v.union(
      v.literal('pending'),
      v.literal('ready'),
      v.literal('unavailable'),
    ),
    embedding: v.optional(v.array(v.number())),
    source: v.union(
      v.literal('chat'),
      v.literal('support'),
      v.literal('feedback'),
      v.literal('product_usage'),
    ),
    createdAt: v.number(),
  })
    .index('by_user_created', ['userId', 'createdAt'])
    .index('by_user_thread', ['userId', 'threadId'])
    .index('by_org_created', ['organizationId', 'createdAt']),

  memoryExtractionRuns: defineTable({
    userId: v.string(),
    threadId: v.optional(v.string()),
    supportThreadId: v.optional(v.id('supportThreads')),
    source: v.union(
      v.literal('chat'),
      v.literal('support'),
      v.literal('feedback'),
      v.literal('product_usage'),
    ),
    status: v.union(
      v.literal('pending'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('skipped'),
    ),
    summary: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_user_created', ['userId', 'createdAt'])
    .index('by_thread_created', ['threadId', 'createdAt']),

  knowledgeSources: defineTable({
    slug: v.string(),
    label: v.string(),
    kind: v.union(
      v.literal('public_docs'),
      v.literal('local_docs'),
      v.literal('product_update'),
      v.literal('manual'),
    ),
    url: v.optional(v.string()),
    enabled: v.boolean(),
    lastSyncedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_slug', ['slug']),

  knowledgeDocuments: defineTable({
    sourceId: v.id('knowledgeSources'),
    slug: v.string(),
    title: v.string(),
    url: v.optional(v.string()),
    body: v.string(),
    checksum: v.string(),
    lastSyncedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_source', ['sourceId'])
    .index('by_source_slug', ['sourceId', 'slug']),

  knowledgeChunks: defineTable({
    sourceId: v.id('knowledgeSources'),
    documentId: v.id('knowledgeDocuments'),
    chunkIndex: v.number(),
    title: v.optional(v.string()),
    text: v.string(),
    keywords: v.array(v.string()),
    embeddingStatus: v.union(
      v.literal('pending'),
      v.literal('ready'),
      v.literal('unavailable'),
    ),
    embedding: v.optional(v.array(v.number())),
    createdAt: v.number(),
  })
    .index('by_document', ['documentId'])
    .index('by_source', ['sourceId']),

  knowledgeSyncRuns: defineTable({
    sourceId: v.id('knowledgeSources'),
    status: v.union(
      v.literal('pending'),
      v.literal('completed'),
      v.literal('failed'),
    ),
    documentsSynced: v.number(),
    chunksSynced: v.number(),
    error: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index('by_source_created', ['sourceId', 'createdAt']),

  // --- Équipe : organisations & membres (surcouche visibilité, additif) ---
  // Le mono-utilisateur reste intact : chaque membre garde SON pipeline scopé
  // `userId`. Une organisation relie des `userId` via `memberships(role)` et
  // accorde aux managers (admin/head_sell) une LECTURE TRANSVERSALE des
  // opportunités de l'équipe + le droit de pointer une priorité. Aucune donnée
  // métier ne porte d'`organizationId` : la visibilité se calcule en itérant les
  // `userId` des membres actifs. Zéro migration.
  organizations: defineTable({
    name: v.string(),
    // authId du créateur (toujours membre 'admin' actif).
    ownerId: v.string(),
    createdAt: v.number(),
  }).index('by_owner', ['ownerId']),

  // Appartenance d'un utilisateur à une organisation, avec son rôle. Une ligne
  // par (org × personne). `userId` est absent tant qu'une invitation par e-mail
  // n'est pas réclamée (statut 'pending') ; il est renseigné soit à l'invitation
  // si l'e-mail correspond déjà à un compte, soit à l'acceptation, soit au
  // signup (trigger `onCreate`). Seuls les membres `status: 'active'` comptent
  // pour la visibilité et les métriques.
  memberships: defineTable({
    organizationId: v.id('organizations'),
    userId: v.optional(v.string()),
    // E-mail cible (lowercased) : clé d'invitation + affichage avant liaison.
    email: v.string(),
    role: v.union(
      v.literal('admin'),
      v.literal('head_sell'),
      v.literal('commercial'),
      v.literal('sdr'),
    ),
    status: v.union(v.literal('pending'), v.literal('active')),
    invitedBy: v.string(),
    invitedAt: v.number(),
    joinedAt: v.optional(v.number()),
    // Consentement carnet (défaut ON / opt-out) : un membre actif partage son
    // carnet (contacts, entreprises, relances) avec ses managers, sauf s'il pose
    // `false`. Sémantique unique : `undefined` ou `true` = partagé ; seul `false`
    // bloque (cf. `carnetSharingEnabled` dans lib/withOrg). N'affecte PAS la
    // visibilité pipeline (team.pipeline / team.metrics restent inchangés).
    shareCarnetWithManager: v.optional(v.boolean()),
  })
    .index('by_org', ['organizationId'])
    .index('by_user', ['userId'])
    .index('by_org_user', ['organizationId', 'userId'])
    .index('by_org_role', ['organizationId', 'role'])
    .index('by_email', ['email'])
    .index('by_org_email', ['organizationId', 'email']),

  // --- Parrainage / affiliation Filon (additif, scope strict par parrain) ---
  // Une ligne par filleul amene via un lien de parrainage. Cree a l'inscription
  // (`claimReferral`, statut 'signed_up'), passe a 'subscribed' a la 1re
  // conversion payante du filleul (declenchee dans `billing.applySubscription`),
  // 'churned' s'il repasse free. `rewardGranted` est le filet d'idempotence :
  // la recompense (mois offerts double face) n'est versee QU'UNE fois.
  referrals: defineTable({
    // authId du parrain (proprietaire de la ligne, scope de lecture).
    referrerUserId: v.string(),
    // authId du filleul (unique : un compte n'a qu'un seul parrain).
    refereeUserId: v.string(),
    refereeEmail: v.optional(v.string()),
    // Code de parrainage utilise (trace, denormalise).
    code: v.string(),
    status: v.union(
      v.literal('signed_up'),
      v.literal('subscribed'),
      v.literal('churned'),
    ),
    // Palier du filleul a la conversion (trace).
    refereePlan: v.optional(v.string()),
    // Idempotence : recompense de conversion deja octroyee ?
    rewardGranted: v.boolean(),
    createdAt: v.number(),
    subscribedAt: v.optional(v.number()),
  })
    .index('by_referrer', ['referrerUserId'])
    .index('by_referee', ['refereeUserId'])
    .index('by_referrer_status', ['referrerUserId', 'status']),

  // Registre des recompenses de parrainage (donnee que Filon possede et calcule,
  // contrairement aux commissions d'entreprise externes : ici, zero double saisie).
  // v1 `kind: 'free_month'` = +30 j de periode payee (extension `planRenewsAt`),
  // applique tout de suite si le beneficiaire est payant, sinon 'pending' jusqu'a
  // son 1er abonnement. `kind: 'commission_cash'` est reserve a un futur versement
  // (Wave/Orange Money/manuel : Paystack NE verse PAS en XOF) : non cable pour l'instant.
  referralRewards: defineTable({
    // authId du beneficiaire de la recompense (parrain OU filleul, double face).
    userId: v.string(),
    referralId: v.id('referrals'),
    kind: v.union(
      v.literal('free_month'),
      v.literal('credit'),
      v.literal('commission_cash'),
    ),
    // Montant : jours pour 'free_month' (30), credits pour 'credit', XOF pour cash.
    amount: v.number(),
    status: v.union(
      v.literal('pending'),
      v.literal('granted'),
      v.literal('paid'),
    ),
    createdAt: v.number(),
    grantedAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_user_status', ['userId', 'status'])
    .index('by_referral', ['referralId']),

  // --- Journal d'accès carnet (audit org, additif) ---
  // Trace quel manager a consulté le carnet de quel membre. Donnée d'AUDIT
  // d'organisation : `organizationId` est porté ICI (n'enfreint pas l'invariant
  // « pas d'organizationId sur les tables de pipeline »). Dédupliqué par jour :
  // une ligne par (viewer × cible × jour UTC), `viewCount` incrémenté. Le membre
  // consulte son propre journal (« consulté par X le Y, k fois »), borné 90 j.
  carnetAccessLog: defineTable({
    viewerUserId: v.string(),
    targetUserId: v.string(),
    organizationId: v.id('organizations'),
    // 'YYYY-MM-DD' (UTC), calculé côté serveur. Clé de déduplication journalière.
    dayKey: v.string(),
    firstViewedAt: v.number(),
    lastViewedAt: v.number(),
    viewCount: v.number(),
  })
    .index('by_target_day', ['targetUserId', 'dayKey'])
    .index('by_viewer_target_day', ['viewerUserId', 'targetUserId', 'dayKey']),
})
