# Filon · Arbre de routes (TanStack Start, file-based)

> Routing file-based sous `src/routes/`. URLs publiques en francais. App protegee
> sous `src/routes/app/`. Provider Convex/Auth scope au layout `app/` (jamais dans
> `__root.tsx`, cf. `tanstack-start-vite-gotchas.md`).
>
> Convention de nommage des fichiers TanStack Start :
> - `app.tsx` = layout (route parente avec `<Outlet />`)
> - `app.index.tsx` = page index de `/app`
> - `app.opportunites.tsx` = page `/app/opportunites`
> - `app.opportunites.$id.tsx` = segment dynamique `/app/opportunites/:id`
>
> Les noms de fonctions Convex cites (`opportunities.list`, etc.) referencent
> `docs/API-CONTRACT.md`. Toute donnee marquee **[a ajouter au contrat]** n'existe
> pas encore dans le contrat et doit y etre ajoutee.

---

## Vue d'ensemble de l'arbre

```
src/routes/
├── __root.tsx                      Shell HTML, <HeadContent/>, <Scripts/>. PAS de provider Convex.
├── index.tsx                       /                      Landing publique
├── connexion.tsx                   /connexion             Connexion (Better Auth email/password)
├── inscription.tsx                 /inscription           Creation de compte
├── api/
│   └── auth.$.tsx                  /api/auth/*            Handler Better Auth (copie byoma)
└── app/
    ├── app.tsx                     /app   (layout)        Garde d'auth + Provider Convex/Auth + sidebar + topbar
    ├── app.index.tsx               /app                   Dashboard (pilotage)
    ├── app.pipeline.tsx            /app/pipeline          Kanban des opportunites (coeur de metier)
    ├── app.opportunites.tsx        /app/opportunites      Liste / table filtrable des opportunites
    ├── app.opportunites.$id.tsx    /app/opportunites/:id  Detail opportunite + timeline d'activite
    ├── app.entreprises.tsx         /app/entreprises       Entreprises + contacts
    ├── app.propositions.tsx        /app/propositions      Demarchage / propositions spontanees
    ├── app.relances.tsx            /app/relances          Relances dues (follow-ups)
    ├── app.documents.tsx           /app/documents         Bibliotheque CV / lettres
    └── app.parametres.tsx          /app/parametres        Parametres compte + preferences pipeline
```

---

## Routes publiques

### `/` · `src/routes/index.tsx`
- **But** : landing marketing. Pitch ("ne laissez plus filer une opportunite de revenu"),
  apercu du pipeline kanban, sections valeur, CTA vers `/inscription` et `/connexion`.
- **Donnees Convex** : aucune (page statique SSR, pas de fetch authentifie).
- **Etats** : pas d'etat de donnees. CTA principal toujours visible.

### `/connexion` · `src/routes/connexion.tsx`
- **But** : connexion par email + mot de passe via Better Auth. Lien vers `/inscription`.
- **Donnees Convex** : `authClient.signIn.email(...)`. Apres succes, `window.location.href = '/app'`
  pour propager le JWT a Convex (cf. convention saas-starter).
- **Etats** :
  - *loading* : bouton en cours, champs desactives, spinner.
  - *error* : message sous le champ (identifiants invalides) via toast + inline.
  - *success* : redirection vers `/app`.

### `/inscription` · `src/routes/inscription.tsx`
- **But** : creation de compte (nom, email, mot de passe). Le trigger `user.onCreate`
  (cote Convex) cree la ligne metier `users` avec `userId`.
- **Donnees Convex** : `authClient.signUp.email(...)`. Redirection `window.location.href = '/app'`.
- **Etats** :
  - *loading* : soumission en cours.
  - *error* : email deja utilise, mot de passe trop court (toast + inline).
  - *success* : redirection `/app`.

### `/api/auth/*` · `src/routes/api/auth.$.tsx`
- **But** : handler serveur Better Auth (GET/POST/OPTIONS). Copie conforme de byoma.
- **Donnees Convex** : delegue a `createAuth(ctx).handler(request)`.

---

## App protegee (`/app/*`)

### `/app` (layout) · `src/routes/app/app.tsx`
- **But** : route parente de toute l'app. Trois responsabilites :
  1. **Garde d'auth** : `beforeLoad` verifie la session ; si absente, `redirect({ to: '/connexion' })`.
  2. **Provider** : monte `ConvexBetterAuthProvider` (scope `/app/*` uniquement, switch SSR-safe
     comme byoma : `ConvexProvider` au premier rendu puis bascule client).
  3. **Chrome** : `<AppSidebar />` (nav verticale desktop, drawer mobile) + `<AppTopbar />`
     (recherche globale, bouton "+ Nouvelle opportunite", menu compte) + `<Outlet />`.
- **Donnees Convex** :
  - `me.current` : profil utilisateur courant (nom, email, avatar) pour la topbar.
  - `relances.dueCount` : badge "relances dues" dans la sidebar. **[a ajouter au contrat]**
- **Etats** :
  - *loading* : skeleton de la coquille (sidebar + topbar) pendant l'hydratation.
  - *error* : si la session expire en cours de route, redirection `/connexion`.

### `/app` (dashboard) · `src/routes/app/app.index.tsx`
- **But** : pilotage. Vue d'ensemble du pipeline et des actions du jour.
- **Composants** : cartes KPI (CA potentiel pondere, nombre d'opportunites actives, taux de
  conversion, relances en retard), mini-funnel par stage, liste "Relances du jour", liste
  "Activite recente", graphe d'entrees d'opportunites par semaine.
- **Donnees Convex** :
  - `dashboard.stats` : KPIs agreges (totaux par stage, CA potentiel pondere, taux de conversion,
    nb relances en retard). **[a ajouter au contrat]**
  - `relances.dueToday` : relances dues aujourd'hui / en retard. **[a ajouter au contrat]**
  - `activity.recent` : dernieres activites (timeline globale, limit 10). **[a ajouter au contrat]**
- **Etats** :
  - *loading* : skeletons des cartes KPI + listes.
  - *empty* : si aucun pipeline encore, encart d'onboarding "Ajoutez votre premiere opportunite"
    avec CTA vers le formulaire de creation.
  - *error* : message d'erreur + bouton "Reessayer".
  - *success* : donnees affichees, toasts sur actions inline (marquer relance faite).

### `/app/pipeline` · `src/routes/app/app.pipeline.tsx`
- **But** : COEUR DE METIER. Kanban drag-drop des opportunites par stage
  (lead · contacte · candidature/proposition envoyee · entretien · negociation · gagne · perdu).
- **Composants** : `KanbanBoard` (colonnes = stages, total + somme CA en tete de colonne),
  `KanbanCard` (titre, entreprise, montant, prochaine relance, badge type), filtres
  (type d'opportunite, entreprise, recherche), `QuickAddCard` en tete de colonne "lead".
- **Interactions** : glisser une carte d'une colonne a l'autre change son stage (optimistic UI),
  clic sur carte ouvre le drawer detail.
- **Donnees Convex** :
  - `opportunities.listByStage` : opportunites groupees par stage (avec montant, type, entreprise,
    prochaine relance). **[a ajouter au contrat]** (ou `opportunities.list` + groupage cote client)
  - `opportunities.updateStage(id, stage)` : mutation au drop.
  - `opportunities.create(...)` : QuickAdd en tete de colonne "lead".
- **Etats** :
  - *loading* : colonnes avec cartes skeleton.
  - *empty* : par colonne, etat vide discret ("Aucune opportunite") ; etat vide global avec CTA.
  - *error* : toast + rollback de l'optimistic update si le drop echoue.
  - *success* : toast "Deplacee vers Entretien", carte repositionnee.

### `/app/opportunites` · `src/routes/app/app.opportunites.tsx`
- **But** : vue table/liste filtrable et triable de toutes les opportunites (complement du kanban
  pour la saisie rapide et le tri en masse).
- **Composants** : `DataTable` (colonnes : titre, type, entreprise, stage, montant, prochaine
  relance, derniere activite), barre de filtres (stage, type, recherche, periode), tri par
  colonne, pagination, bouton "+ Nouvelle opportunite" (Dialog formulaire).
- **Donnees Convex** :
  - `opportunities.list(filters)` : liste paginee filtrable (stage, type, recherche). Construire
    l'objet de filtres dynamiquement (jamais `undefined` en arg Convex).
  - `opportunities.create(...)` / `opportunities.update(...)` : creation/edition via Dialog.
- **Etats** :
  - *loading* : lignes skeleton.
  - *empty* : etat vide avec illustration + CTA "Ajouter une opportunite" (et message different
    si filtre actif : "Aucun resultat pour ces filtres").
  - *error* : bandeau d'erreur + "Reessayer".
  - *success* : table peuplee, toast sur create/update/delete.

### `/app/opportunites/:id` · `src/routes/app/app.opportunites.$id.tsx`
- **But** : detail complet d'une opportunite + timeline d'activite (le journal de l'opportunite).
- **Composants** : entete (titre, stage editable, montant, type, lien source/offre), panneau
  entreprise + contact lie, panneau documents attaches (CV/lettre utilises), `ActivityTimeline`
  (notes, changements de stage, relances planifiees/faites, emails consignes), composer de note,
  bloc "Prochaine relance" (date + intitule, bouton "Marquer faite"), actions (archiver, supprimer
  via AlertDialog Radix).
- **Interactions** : changer le stage, ajouter une note, planifier/completer une relance, lier un
  contact, attacher un document.
- **Donnees Convex** :
  - `opportunities.get(id)` : opportunite + relations resolues (entreprise, contact, documents).
    **[a ajouter au contrat]** (ou `opportunities.getById`)
  - `activity.listByOpportunity(id)` : timeline. **[a ajouter au contrat]**
  - `opportunities.updateStage(id, stage)`, `opportunities.update(id, ...)`.
  - `activity.addNote(opportunityId, body)` : ajout de note. **[a ajouter au contrat]**
  - `followups.create(...)` / `followups.complete(id)` : relances. **[a ajouter au contrat]**
  - `documents.attach(opportunityId, documentId)` : lier un doc. **[a ajouter au contrat]**
- **Etats** :
  - *loading* : skeleton entete + timeline.
  - *empty* : timeline vide ("Aucune activite, ajoutez une note ou planifiez une relance").
  - *error* : 404 si id inconnu/non possede par l'utilisateur (redirection `/app/opportunites` + toast).
  - *success* : toasts sur chaque action (note ajoutee, stage change, relance faite).

### `/app/entreprises` · `src/routes/app/app.entreprises.tsx`
- **But** : repertoire des entreprises ciblees et de leurs contacts.
- **Composants** : liste/grille d'entreprises (nom, secteur, nb d'opportunites liees, site), panneau
  ou Dialog d'edition entreprise, sous-liste des contacts (nom, role, email, telephone, LinkedIn),
  Dialog d'ajout de contact, recherche.
- **Interactions** : creer/editer une entreprise, ajouter un contact, voir les opportunites liees.
- **Donnees Convex** :
  - `companies.list(search)` : entreprises de l'utilisateur. **[a ajouter au contrat]**
  - `companies.create(...)` / `companies.update(...)`. **[a ajouter au contrat]**
  - `contacts.listByCompany(companyId)`. **[a ajouter au contrat]**
  - `contacts.create(...)` / `contacts.update(...)`. **[a ajouter au contrat]**
- **Etats** :
  - *loading* : cartes skeleton.
  - *empty* : etat vide + CTA "Ajouter une entreprise".
  - *error* : bandeau + "Reessayer".
  - *success* : toasts CRUD.

### `/app/propositions` · `src/routes/app/app.propositions.tsx`
- **But** : suivi du demarchage / propositions spontanees envoyees a des entreprises (sous-vue
  filtree des opportunites de type `proposition` + `prospection`, orientee envoi et relance).
- **Composants** : liste des propositions (entreprise cible, objet, doc envoye, date d'envoi, statut
  de relance), Dialog "Nouvelle proposition" (cible + document + note), filtre par statut.
- **Interactions** : creer une proposition (cree une opportunite de type proposition au stage
  approprie), marquer comme envoyee, planifier la relance.
- **Donnees Convex** :
  - `opportunities.list({ type: ['proposition','prospection'] })` : reutilise le contrat opportunites.
  - `opportunities.create({ type: 'proposition', ... })`.
  - `followups.create(...)` : relance liee.
- **Etats** :
  - *loading* : lignes skeleton.
  - *empty* : etat vide + CTA "Envoyer une proposition".
  - *error* : bandeau + "Reessayer".
  - *success* : toast "Proposition enregistree".

### `/app/relances` · `src/routes/app/app.relances.tsx`
- **But** : centre des relances dues (follow-ups). Vue actionnable : ce qu'il faut relancer
  aujourd'hui, en retard, a venir.
- **Composants** : sections "En retard" / "Aujourd'hui" / "A venir", chaque ligne (opportunite +
  entreprise + intitule + date), actions inline "Marquer faite", "Reporter" (date picker), lien vers
  le detail de l'opportunite.
- **Interactions** : completer une relance, la reporter (replanifie la date), ouvrir l'opportunite.
- **Donnees Convex** :
  - `followups.listDue(scope)` : relances groupees (overdue / today / upcoming). **[a ajouter au contrat]**
  - `followups.complete(id)`. **[a ajouter au contrat]**
  - `followups.snooze(id, date)` : reporter. **[a ajouter au contrat]**
- **Etats** :
  - *loading* : lignes skeleton par section.
  - *empty* : etat vide positif ("Aucune relance en attente, vous etes a jour").
  - *error* : bandeau + "Reessayer".
  - *success* : toast "Relance marquee comme faite" / "Reportee au ...", retrait optimiste de la ligne.

### `/app/documents` · `src/routes/app/app.documents.tsx`
- **But** : bibliotheque de documents reutilisables (CV, lettres de motivation, portfolios PDF) a
  attacher aux candidatures et propositions.
- **Composants** : grille de documents (nom, type, taille, date), zone d'upload (drag-drop +
  bouton), apercu/telechargement, suppression (AlertDialog), filtre par type.
- **Interactions** : uploader un document (Convex file storage), renommer, supprimer, voir ou il est
  attache.
- **Donnees Convex** :
  - `documents.list(type)` : documents de l'utilisateur. **[a ajouter au contrat]**
  - `documents.generateUploadUrl()` + `documents.create(...)` : upload via storage Convex. **[a ajouter au contrat]**
  - `documents.remove(id)`. **[a ajouter au contrat]**
- **Etats** :
  - *loading* : tuiles skeleton.
  - *empty* : etat vide + zone d'upload mise en avant.
  - *error* : toast d'echec d'upload + bandeau de liste.
  - *success* : toast "Document ajoute", barre de progression pendant l'upload.

### `/app/parametres` · `src/routes/app/app.parametres.tsx`
- **But** : parametres du compte et preferences du pipeline.
- **Composants** : onglets "Compte" (nom, email, avatar, changement de mot de passe), "Pipeline"
  (libelle/ordre des stages, devise d'affichage du CA, delai de relance par defaut), "Apparence"
  (theme clair/sombre), "Danger" (deconnexion, suppression de compte via AlertDialog).
- **Interactions** : mettre a jour le profil, changer le theme, configurer les stages, se deconnecter
  (`window.location.href` apres `signOut`).
- **Donnees Convex** :
  - `me.current` : profil. **[a ajouter au contrat]** (ou `users.me`)
  - `me.updateProfile(...)`. **[a ajouter au contrat]**
  - `settings.get` / `settings.update(...)` : preferences pipeline (devise, delai relance, stages). **[a ajouter au contrat]**
- **Etats** :
  - *loading* : skeleton des champs.
  - *empty* : non applicable (toujours un profil).
  - *error* : toast d'echec de sauvegarde.
  - *success* : toast "Parametres enregistres".

---

## Garde d'authentification (recap)

- Toute route sous `/app/*` herite du `beforeLoad` du layout `app.tsx` : pas de session valide ->
  `redirect({ to: '/connexion' })`.
- Les pages publiques (`/`, `/connexion`, `/inscription`) ne montent jamais le provider Convex
  authentifie (evite "more than one copy of React" au SSR).
- Multi-tenant : chaque query/mutation Convex consommee ci-dessus passe cote backend par
  `withUser(ctx)` et un index `by_user` (jamais de scan global).
