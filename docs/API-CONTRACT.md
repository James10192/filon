# Filon · contrat d'API Convex

Ce document fige le **contrat** que tous les agents respectent. Chaque fonction
listée doit être implémentée avec le **nom exact**, le **type exact**
(`query` | `mutation`), les **args typés** et la **valeur de retour** décrits ici.

## Règles transverses (obligatoires)

- **Multi-tenant strict.** Toute query/mutation métier commence par
  `const { userId } = await requireUser(ctx)` (helper `convex/lib/withUser.ts`),
  ou utilise `withUserQuery` / `withUserMutation`.
- **Scope par index.** Toujours lire via un index `by_user*`, jamais de
  `ctx.db.query(table).collect()` sans filtre user. Toute écriture force
  `userId` à la valeur du user courant (jamais depuis les args du client).
- **Vérification de propriété.** Avant `patch` / `delete` / lecture par `id`,
  charger le doc et vérifier `doc.userId === userId`, sinon throw `Non autorisé`.
- **Jamais `undefined` dans un insert/patch.** Construire l'objet d'args
  dynamiquement, n'inclure que les champs définis.
- **Horodatage.** `createdAt` / `updatedAt` = `Date.now()` (number, ms). Les
  champs date métier (`deadline`, `dueDate`, `nextActionAt`, `appliedAt`,
  `sentAt`, `doneAt`) sont des **strings ISO**.
- **Messages d'erreur en français** (`Non authentifié`, `Non autorisé`,
  `Introuvable`).

Fichiers Convex par domaine (1 fichier = 1 domaine, cf. no-god-code) :
`opportunities.ts`, `activities.ts`, `companies.ts`, `contacts.ts`,
`followups.ts`, `proposals.ts`, `documents.ts`, `dashboard.ts`, `settings.ts`,
`users.ts`.

---

## Domaine : opportunities (`convex/opportunities.ts`)

Coeur du produit. Les fonctions sont référencées par `api.opportunities.*`.

| Fonction | Type | Args | Retour |
|---|---|---|---|
| `api.opportunities.list` | query | `{ stage?: Stage, type?: OppType, search?: string }` | `Opportunity[]` du user (filtré optionnellement), trié `createdAt desc`. |
| `api.opportunities.board` | query | `{}` | `Record<Stage, Opportunity[]>` : opportunités groupées par stage, triées par `order asc` dans chaque colonne. Forme prête pour le kanban. |
| `api.opportunities.get` | query | `{ id: Id<'opportunities'> }` | `Opportunity & { company?: Company, contact?: Contact }` ou throw si pas au user. |
| `api.opportunities.create` | mutation | `{ title, type, companyId?, contactId?, source?, url?, location?, compensation?, stage?, priority?, deadline?, appliedAt?, nextActionAt?, tags?, description? }` | `Id<'opportunities'>`. Defaults : `stage='lead'`, `priority='medium'`, `tags=[]`, `order` = max(order de la colonne cible)+1. Set `createdAt`/`updatedAt`. |
| `api.opportunities.update` | mutation | `{ id, ...champs partiels: title?, type?, companyId?, contactId?, source?, url?, location?, compensation?, priority?, deadline?, appliedAt?, nextActionAt?, tags?, description? }` | `null`. Patch + `updatedAt`. Ne change PAS le stage (voir `move`). |
| `api.opportunities.move` | mutation | `{ id, stage: Stage, order: number }` | `null`. Déplace une carte dans le kanban : set `stage` + `order` + `updatedAt`. Si `stage` change vers `won`/`lost`/autre, crée une activité `status_change` (voir activities.logStatusChange interne). |
| `api.opportunities.reorder` | mutation | `{ stage: Stage, orderedIds: Id<'opportunities'>[] }` | `null`. Réécrit le champ `order` (0..n) de toutes les cartes d'une colonne selon l'ordre fourni. |
| `api.opportunities.setStage` | mutation | `{ id, stage: Stage }` | `null`. Change le stage sans réordonner (place en fin de colonne cible), set `updatedAt`, log activité `status_change`. |
| `api.opportunities.remove` | mutation | `{ id }` | `null`. Supprime l'opportunité + cascade : ses `activities` et détache (`opportunityId=undefined`) ses `followups` et `documents`. |

Types union :
- `Stage = 'lead' | 'contacted' | 'applied' | 'interview' | 'negotiation' | 'won' | 'lost'`
- `OppType = 'job_offer' | 'spontaneous' | 'prospect' | 'mission'`
- `Priority = 'low' | 'medium' | 'high'`

---

## Domaine : activities (`convex/activities.ts`)

Timeline d'une opportunité. Référencées par `api.activities.*`.

| Fonction | Type | Args | Retour |
|---|---|---|---|
| `api.activities.listByOpportunity` | query | `{ opportunityId: Id<'opportunities'> }` | `Activity[]` du user pour cette opportunité, trié `createdAt desc`. Throw si l'opportunité n'appartient pas au user. |
| `api.activities.recent` | query | `{ limit?: number }` | `(Activity & { opportunityTitle: string })[]` : dernières activités tous opportunités confondues du user (défaut limit 20). |
| `api.activities.add` | mutation | `{ opportunityId, kind, content }` | `Id<'activities'>`. Vérifie la propriété de l'opportunité. Set `userId` + `createdAt`. |
| `api.activities.remove` | mutation | `{ id }` | `null`. Vérifie propriété. |

`ActivityKind = 'note' | 'email' | 'call' | 'interview' | 'status_change' | 'other'`

> Helper interne (non exposé en API publique, utilisé par `opportunities.move`/`setStage`) : créer une activité `status_change` au sein de la même transaction.

---

## Domaine : companies (`convex/companies.ts`)

Référencées par `api.companies.*`.

| Fonction | Type | Args | Retour |
|---|---|---|---|
| `api.companies.list` | query | `{ search?: string }` | `Company[]` du user, trié `name asc`. |
| `api.companies.get` | query | `{ id: Id<'companies'> }` | `Company` ou throw. |
| `api.companies.create` | mutation | `{ name, website?, sector?, location?, source?, notes? }` | `Id<'companies'>`. Set `userId` + `createdAt`. |
| `api.companies.update` | mutation | `{ id, name?, website?, sector?, location?, source?, notes? }` | `null`. Patch après check propriété. |
| `api.companies.remove` | mutation | `{ id }` | `null`. Détache (`companyId=undefined`) les `contacts`, `opportunities`, `proposals` liés avant suppression. |

---

## Domaine : contacts (`convex/contacts.ts`)

Référencées par `api.contacts.*`.

| Fonction | Type | Args | Retour |
|---|---|---|---|
| `api.contacts.list` | query | `{ companyId?: Id<'companies'>, search?: string }` | `(Contact & { companyName?: string })[]` du user, trié `name asc`. |
| `api.contacts.get` | query | `{ id: Id<'contacts'> }` | `Contact & { company?: Company }` ou throw. |
| `api.contacts.create` | mutation | `{ name, companyId?, role?, email?, phone?, linkedin?, notes? }` | `Id<'contacts'>`. Si `companyId` fourni, vérifier qu'elle appartient au user. Set `userId` + `createdAt`. |
| `api.contacts.update` | mutation | `{ id, name?, companyId?, role?, email?, phone?, linkedin?, notes? }` | `null`. Check propriété. |
| `api.contacts.remove` | mutation | `{ id }` | `null`. Détache (`contactId=undefined`) les `opportunities` liées. |

---

## Domaine : followups (`convex/followups.ts`)

Relances datées. Référencées par `api.followups.*`.

| Fonction | Type | Args | Retour |
|---|---|---|---|
| `api.followups.list` | query | `{ done?: boolean, opportunityId?: Id<'opportunities'> }` | `(Followup & { opportunityTitle?: string })[]` du user, trié `dueDate asc`. |
| `api.followups.upcoming` | query | `{ withinDays?: number }` | `(Followup & { opportunityTitle?: string })[]` non terminées (`done=false`) dont `dueDate <= now + withinDays` (défaut 7), trié `dueDate asc`. |
| `api.followups.overdue` | query | `{}` | `Followup[]` non terminées dont `dueDate < aujourd'hui`. |
| `api.followups.create` | mutation | `{ label, dueDate, opportunityId? }` | `Id<'followups'>`. `done=false`, set `userId` + `createdAt`. |
| `api.followups.update` | mutation | `{ id, label?, dueDate?, opportunityId? }` | `null`. Check propriété. |
| `api.followups.toggle` | mutation | `{ id, done: boolean }` | `null`. Set `done` + `doneAt` (ISO si `true`, sinon retiré). |
| `api.followups.remove` | mutation | `{ id }` | `null`. Check propriété. |

---

## Domaine : proposals (`convex/proposals.ts`)

Propositions spontanées / démarchage. Référencées par `api.proposals.*`.

| Fonction | Type | Args | Retour |
|---|---|---|---|
| `api.proposals.list` | query | `{ status?: ProposalStatus }` | `(Proposal & { companyName?: string })[]` du user, trié `createdAt desc`. |
| `api.proposals.get` | query | `{ id: Id<'proposals'> }` | `Proposal & { company?: Company }` ou throw. |
| `api.proposals.create` | mutation | `{ title, pitch, companyId?, amount?, currency?, status? }` | `Id<'proposals'>`. Defaults : `status='draft'`, `currency='XOF'`. Set `userId` + `createdAt`/`updatedAt`. |
| `api.proposals.update` | mutation | `{ id, title?, pitch?, companyId?, amount?, currency? }` | `null`. Patch + `updatedAt`. Check propriété. |
| `api.proposals.setStatus` | mutation | `{ id, status: ProposalStatus }` | `null`. Set `status` + `updatedAt`. Si `status='sent'`, set `sentAt` = now ISO. |
| `api.proposals.remove` | mutation | `{ id }` | `null`. Check propriété. |

`ProposalStatus = 'draft' | 'sent' | 'accepted' | 'refused'`

---

## Domaine : documents (`convex/documents.ts`)

Bibliothèque via Convex storage. Référencées par `api.documents.*`.

| Fonction | Type | Args | Retour |
|---|---|---|---|
| `api.documents.generateUploadUrl` | mutation | `{}` | `string` (URL d'upload Convex). Exige user authentifié. |
| `api.documents.list` | query | `{ kind?: DocKind, opportunityId?: Id<'opportunities'> }` | `(Document & { url: string \| null })[]` du user, trié `createdAt desc`. `url` résolu via `ctx.storage.getUrl(storageId)`. |
| `api.documents.create` | mutation | `{ name, kind, storageId, opportunityId?, size? }` | `Id<'documents'>`. Enregistre le doc après upload. Set `userId` + `createdAt`. |
| `api.documents.update` | mutation | `{ id, name?, kind?, opportunityId? }` | `null`. Check propriété (métadonnées seulement). |
| `api.documents.remove` | mutation | `{ id }` | `null`. Supprime le blob (`ctx.storage.delete(storageId)`) puis le doc. Check propriété. |

`DocKind = 'cv' | 'lettre' | 'portfolio' | 'contrat' | 'autre'`

---

## Domaine : dashboard (`convex/dashboard.ts`)

Agrégats de pilotage (lecture seule). Référencées par `api.dashboard.*`.

| Fonction | Type | Args | Retour |
|---|---|---|---|
| `api.dashboard.summary` | query | `{}` | Objet de pilotage : `{ totalOpportunities, byStage: Record<Stage, number>, byType: Record<OppType, number>, activeCount, wonCount, lostCount, winRate (number 0..1), followupsOverdue, followupsUpcoming (7j), proposalsSent, companiesCount, contactsCount, documentsCount }`. |
| `api.dashboard.pipeline` | query | `{}` | `{ stage: Stage, count: number }[]` ordonné selon l'ordre canonique du pipeline (lead → lost). Pour l'histogramme/funnel. |
| `api.dashboard.upcomingActions` | query | `{ limit?: number }` | `{ followups: (Followup & { opportunityTitle?: string })[], opportunities: Opportunity[] }` : relances non terminées à venir + opportunités dont `nextActionAt` approche, triées par date. |
| `api.dashboard.recentActivity` | query | `{ limit?: number }` | `(Activity & { opportunityTitle: string })[]` : flux d'activité récent (défaut 10). |

---

## Domaine : settings (`convex/settings.ts`)

Préférences user (1 ligne par user). Référencées par `api.settings.*`.

| Fonction | Type | Args | Retour |
|---|---|---|---|
| `api.settings.get` | query | `{}` | `Settings` du user, ou un objet par défaut `{ pipelineStages: undefined, currency: 'XOF' }` si pas encore créé (ne throw pas). |
| `api.settings.upsert` | mutation | `{ pipelineStages?, currency? }` | `null`. Crée la ligne si absente sinon patch + `updatedAt`. |

---

## Domaine : users (`convex/users.ts`)

Profil applicatif. Alimenté par le trigger Better Auth `user.onCreate` (dans
`convex/auth.ts`, hors de ce contrat). Référencées par `api.users.*`.

| Fonction | Type | Args | Retour |
|---|---|---|---|
| `api.users.me` | query | `{}` | `User` (profil du user courant) ou `null` si non authentifié. |
| `api.users.updateProfile` | mutation | `{ name?, headline? }` | `null`. Patch le profil du user courant. |

---

## Référence des formes (types retournés)

Toutes les tables exposent les champs de `convex/schema.ts` plus les champs
système Convex `_id` et `_creationTime`. Résumé des champs métier :

- **User** : `authId, email, name?, headline?, createdAt`
- **Company** : `userId, name, website?, sector?, location?, source?, notes?, createdAt`
- **Contact** : `userId, companyId?, name, role?, email?, phone?, linkedin?, notes?, createdAt`
- **Opportunity** : `userId, title, type, companyId?, contactId?, source?, url?, location?, compensation?, stage, priority, deadline?, appliedAt?, nextActionAt?, tags[], description?, order, createdAt, updatedAt`
- **Activity** : `userId, opportunityId, kind, content, createdAt`
- **Followup** : `userId, opportunityId?, label, dueDate, done, doneAt?, createdAt`
- **Proposal** : `userId, companyId?, title, pitch, amount?, currency?, status, sentAt?, createdAt, updatedAt`
- **Document** : `userId, name, kind, storageId, opportunityId?, size?, createdAt`
- **Settings** : `userId, pipelineStages?, currency?, createdAt, updatedAt`
