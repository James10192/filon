# Filon · Carte des fonctionnalites (FEATURES)

> Filon est un SaaS web qui aide un developpeur / freelance a ne jamais laisser filer
> une opportunite de revenu. Coeur de metier : un pipeline kanban d'opportunites
> (candidatures, propositions spontanees, prospection freelance, missions), avec
> relances datees, contacts & entreprises, documents et un dashboard de pilotage.
>
> Multi-tenant par `userId` des le jour 1. Chaque feature consomme des fonctions
> Convex nommees ; voir `docs/API-CONTRACT.md`. Les donnees marquees
> **[a ajouter au contrat]** doivent y etre ajoutees.
>
> Principes transverses (toutes les features) :
> - 4 etats geres partout : *loading* (skeleton), *empty* (CTA d'amorcage),
>   *error* (bandeau + reessayer), *success* (toast sur chaque action).
> - Saisie ultra-rapide : QuickAdd, raccourci global "+ Nouvelle opportunite",
>   optimistic UI sur les actions frequentes.
> - shadcn/ui (Radix + CVA), monochrome zinc + accent indigo, mobile-first,
>   AlertDialog Radix (jamais window.confirm).

---

## Modele de domaine (rappel)

- **Opportunite** : l'entite centrale. `type` ∈ { `candidature` (offre d'emploi),
  `proposition` (spontanee a une entreprise), `prospection` (demarchage freelance),
  `mission` (en cours) }. `stage` ∈ { `lead`, `contacte`, `envoye` (candidature/proposition
  envoyee), `entretien`, `negociation`, `gagne`, `perdu` }. Porte `montant` (CA potentiel),
  `entrepriseId?`, `contactId?`, `source`, `userId`.
- **Entreprise** : organisation ciblee (nom, secteur, site). Porte `userId`.
- **Contact** : personne dans une entreprise (nom, role, email, telephone, LinkedIn). Porte `userId`.
- **Relance (follow-up)** : action datee liee a une opportunite (intitule, date due, statut
  `pending`/`done`). Porte `userId`.
- **Activite** : entree de timeline d'une opportunite (note, changement de stage, relance,
  email consigne). Porte `userId`.
- **Document** : fichier reutilisable (CV, lettre, portfolio) stocke dans Convex storage.
  Porte `userId`.
- **Preferences** : reglages pipeline par utilisateur (devise, delai de relance par defaut,
  libelles/ordre des stages). Porte `userId`.

---

## Features

### F1 · Pipeline kanban (coeur de metier) · `/app/pipeline`
- **Valeur** : vue d'ensemble instantanee de tout l'argent en mouvement. On voit d'un coup
  d'oeil ou en est chaque opportunite et combien de CA potentiel se trouve a chaque etape.
- **Composants** : `KanbanBoard`, `KanbanColumn` (en-tete avec compteur + somme du CA de la
  colonne), `KanbanCard` (titre, entreprise, montant, badge type, pastille de prochaine relance
  rouge si en retard), `QuickAddCard` (saisie directe en tete de "lead"), barre de filtres
  (type, entreprise, recherche).
- **Interactions clefs** :
  - Glisser-deposer une carte entre colonnes -> change le `stage` (optimistic UI, rollback +
    toast en cas d'echec).
  - QuickAdd : titre + entreprise -> cree une opportunite au stage `lead` sans quitter le board.
  - Clic carte -> ouvre le detail/drawer de l'opportunite.
- **Convex** : `opportunities.listByStage` **[a ajouter au contrat]**, `opportunities.updateStage`,
  `opportunities.create`.

### F2 · Liste des opportunites · `/app/opportunites`
- **Valeur** : complement du kanban pour la saisie en masse, le tri et la recherche. La table est
  l'outil "bureau" quand le board devient trop dense.
- **Composants** : `DataTable` triable/paginee (titre, type, entreprise, stage, montant, prochaine
  relance, derniere activite), `OpportunityFilters` (stage, type, recherche, periode),
  `OpportunityFormDialog` (creation/edition).
- **Interactions clefs** : creer/editer/supprimer (AlertDialog), filtrer et trier, ouvrir le
  detail. Filtres construits dynamiquement (jamais `undefined` en arg Convex).
- **Convex** : `opportunities.list(filters)`, `opportunities.create`, `opportunities.update`,
  `opportunities.remove` **[a ajouter au contrat]**.

### F3 · Detail opportunite + timeline · `/app/opportunites/:id`
- **Valeur** : le journal vivant d'une opportunite. Tout l'historique (notes, relances, changements
  de stage, docs envoyes) au meme endroit, pour reprendre le fil avant un entretien ou une relance.
- **Composants** : entete editable (stage, montant, type, source), `CompanyContactPanel`,
  `AttachedDocumentsPanel`, `ActivityTimeline`, `NoteComposer`, `NextFollowupCard`,
  actions (archiver, supprimer).
- **Interactions clefs** : changer le stage, ajouter une note, planifier/completer une relance,
  lier un contact, attacher un document, consigner un email.
- **Convex** : `opportunities.get(id)` **[a ajouter au contrat]**, `activity.listByOpportunity`
  **[a ajouter au contrat]**, `activity.addNote` **[a ajouter au contrat]**, `opportunities.update`,
  `followups.create`/`followups.complete` **[a ajouter au contrat]**, `documents.attach`
  **[a ajouter au contrat]**.

### F4 · Entreprises & contacts · `/app/entreprises`
- **Valeur** : le carnet d'adresses du chasseur de revenu. Savoir qui contacter, ou, et combien
  d'opportunites sont deja en cours avec chaque entreprise.
- **Composants** : `CompanyList`/`CompanyCard` (secteur, site, nb d'opportunites liees),
  `CompanyFormDialog`, `ContactList` (role, email, telephone, LinkedIn), `ContactFormDialog`,
  recherche.
- **Interactions clefs** : creer/editer une entreprise, ajouter un contact, sauter aux
  opportunites liees, copier un email/telephone en un clic.
- **Convex** : `companies.list` **[a ajouter au contrat]**, `companies.create`/`companies.update`
  **[a ajouter au contrat]**, `contacts.listByCompany` **[a ajouter au contrat]**,
  `contacts.create`/`contacts.update` **[a ajouter au contrat]**.

### F5 · Propositions & demarchage · `/app/propositions`
- **Valeur** : piloter l'offensive commerciale (propositions spontanees + prospection freelance),
  la ou un dev laisse souvent filer du revenu faute de suivi des envois et relances.
- **Composants** : `PropositionList` (cible, objet, doc envoye, date d'envoi, statut de relance),
  `PropositionFormDialog` (entreprise cible + document + note), filtre par statut.
- **Interactions clefs** : envoyer une proposition (cree une opportunite type `proposition`),
  attacher le document envoye, planifier la relance dans la foulee, marquer comme envoyee.
- **Convex** : reutilise `opportunities.list({ type })`, `opportunities.create({ type:'proposition' })`,
  `followups.create`, `documents.list` (selection du doc a envoyer).

### F6 · Relances (follow-ups) · `/app/relances`
- **Valeur** : le rappel anti-oubli. Aucune relance datee ne passe a la trappe, c'est souvent une
  simple relance qui transforme un lead en contrat.
- **Composants** : sections `Overdue` / `Today` / `Upcoming`, `FollowupRow` (opportunite +
  entreprise + intitule + date + actions), date picker pour reporter.
- **Interactions clefs** : "Marquer faite" (retrait optimiste + toast), "Reporter" (replanifie la
  date), ouvrir l'opportunite liee. Badge global du nombre de relances dues dans la sidebar.
- **Convex** : `followups.listDue` **[a ajouter au contrat]**, `followups.complete`
  **[a ajouter au contrat]**, `followups.snooze` **[a ajouter au contrat]**,
  `relances.dueCount` (badge sidebar) **[a ajouter au contrat]**.

### F7 · Bibliotheque de documents · `/app/documents`
- **Valeur** : avoir CV, lettres et portfolios prets a attacher en un clic a une candidature ou une
  proposition, sans rechercher le bon fichier a chaque fois.
- **Composants** : `DocumentGrid`/`DocumentCard` (nom, type, taille, date), `DocumentUploader`
  (drag-drop + bouton, barre de progression), apercu/telechargement, suppression (AlertDialog),
  filtre par type.
- **Interactions clefs** : uploader (Convex file storage via upload URL), renommer, supprimer,
  voir ou un document est attache, attacher depuis le detail d'opportunite.
- **Convex** : `documents.list` **[a ajouter au contrat]**, `documents.generateUploadUrl` +
  `documents.create` **[a ajouter au contrat]**, `documents.remove` **[a ajouter au contrat]**.

### F8 · Dashboard de pilotage · `/app` (index)
- **Valeur** : repondre en 5 secondes a "ou en est mon revenu ?" : CA potentiel pondere, ce qu'il
  faut relancer aujourd'hui, le taux de conversion, et les actions recentes.
- **Composants** : cartes KPI (`StatCard` : CA potentiel pondere, opportunites actives, taux de
  conversion, relances en retard), `MiniFunnel` par stage, `DueTodayList`, `RecentActivityList`,
  graphe d'entrees d'opportunites par semaine.
- **Interactions clefs** : marquer une relance faite directement depuis le dashboard, cliquer un
  KPI pour filtrer la liste correspondante, CTA d'amorcage si pipeline vide.
- **Convex** : `dashboard.stats` **[a ajouter au contrat]**, `relances.dueToday`
  **[a ajouter au contrat]**, `activity.recent` **[a ajouter au contrat]**.

### F9 · Authentification & multi-tenant · `/connexion`, `/inscription`, layout `/app`
- **Valeur** : un vrai SaaS ouvrable au public ; chaque utilisateur voit uniquement ses propres
  donnees, isolees par `userId`.
- **Composants** : `SignInForm`, `SignUpForm`, garde `beforeLoad` du layout `app.tsx`, provider
  Convex/Auth scope `/app/*`.
- **Interactions clefs** : inscription (trigger `user.onCreate` cree la ligne metier `users`),
  connexion (`window.location.href` pour propager le JWT), deconnexion. Toutes les fonctions metier
  passent par `withUser(ctx)` + index `by_user`.
- **Convex** : Better Auth (`authClient.signIn/signUp/signOut`), `me.current` **[a ajouter au contrat]**.

### F10 · Parametres & preferences pipeline · `/app/parametres`
- **Valeur** : adapter Filon a sa facon de travailler (devise du CA, delai de relance par defaut,
  libelles de stages) et gerer son compte.
- **Composants** : onglets `Compte` / `Pipeline` / `Apparence` / `Danger`, `ProfileForm`,
  `PipelinePrefsForm`, `ThemeToggle`, `DeleteAccountDialog` (AlertDialog).
- **Interactions clefs** : mettre a jour le profil, changer le theme clair/sombre, configurer les
  stages et la devise, se deconnecter, supprimer le compte.
- **Convex** : `me.current`/`me.updateProfile` **[a ajouter au contrat]**, `settings.get`/
  `settings.update` **[a ajouter au contrat]**.

---

## Synthese des fonctions Convex a ajouter au contrat

Si elles ne figurent pas deja dans `docs/API-CONTRACT.md`, les fonctions suivantes doivent y etre
ajoutees (toutes scope `userId` via `withUser`) :

- **opportunities** : `list(filters)`, `listByStage`, `get(id)`, `create`, `update`, `updateStage`, `remove`
- **companies** : `list(search)`, `create`, `update`, `remove`
- **contacts** : `listByCompany(companyId)`, `create`, `update`, `remove`
- **followups** : `listDue(scope)`, `dueToday`, `dueCount`, `create`, `complete`, `snooze`
- **activity** : `listByOpportunity(id)`, `recent(limit)`, `addNote(opportunityId, body)`
- **documents** : `list(type)`, `generateUploadUrl`, `create`, `attach(opportunityId, documentId)`, `remove`
- **dashboard** : `stats`
- **me** : `current`, `updateProfile`
- **settings** : `get`, `update`

> Note : `relances.*` et `followups.*` referencent le meme domaine (relances). Le contrat doit
> trancher un nom unique (suggestion : `followups`) ; ROUTES.md/FEATURES.md utilisent les deux par
> commodite de lecture mais pointent vers le meme module.
