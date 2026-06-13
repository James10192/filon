# Filon · contrat UX (fondations atelier)

Ce document fige les **primitives UX partagees** et les **regles de densite**
posees par la phase fondations. Les pages app/\* (Tableau de bord, Pipeline,
Opportunites, Entreprises, Propositions, Relances, Documents, Parametres)
doivent s'y conformer. Cible : un atelier dense, sobre, clavier-first, facon
Linear / Attio.

Principes transverses (rappel) : monochrome zinc + un seul accent indigo,
tokens existants de `src/styles/app.css` (jamais de couleur inventee), police
Inter, titres `tracking -0.02em`, UI 100 % francais, aucun tiret long, mobile
first, cibles tactiles `>= h-11` pour les actions primaires.

---

## 1. PageToolbar (`src/components/app/page-toolbar.tsx`)

En-tete de page **unifiee**. Toutes les pages l'utilisent a la place d'un
`<header>` ad hoc.

### API

| Prop       | Type              | Defaut  | Role |
|------------|-------------------|---------|------|
| `title`    | `string`          | requis  | Titre de page (19px, semibold, tracking -0.02em, tronque). |
| `subtitle` | `string?`         | —       | Sous-titre discret (`text-fg-muted`), tronque. |
| `actions`  | `React.ReactNode?`| —       | Slot droite : boutons d'action (filtre, ajout, export). |
| `children` | `React.ReactNode?`| —       | Barre de filtres / segmentation rendue **sous** le titre. |
| `sticky`   | `boolean`         | `false` | Colle l'en-tete sous la topbar (`top-16`) au scroll. |
| `className`| `string?`         | —       | Classes additionnelles sur le conteneur. |

### Exemple

```tsx
import { PageToolbar } from '~/components/app/page-toolbar'

<PageToolbar
  title="Opportunités"
  subtitle="Toutes vos pistes, candidatures et missions"
  actions={
    <Button onClick={...}>
      <Plus className="size-4" /> Ajouter
    </Button>
  }
>
  {/* barre de filtres : recherche + selects */}
  <div className="flex flex-wrap items-center gap-2">…</div>
</PageToolbar>
```

### Regles d'usage

- Un seul `PageToolbar` par page, en tete du contenu.
- Les filtres vont dans `children`, pas dans `actions` (qui ne porte que les
  actions primaires/secondaires).
- Utiliser `sticky` sur les pages a longues listes (Opportunites, Relances,
  Documents) pour garder les filtres accessibles.

---

## 2. Palette de commandes (`src/components/app/command-palette.tsx`)

Dialog Radix Cmd+K / Ctrl+K, **sans dependance externe** (filtrage et
navigation clavier faits a la main). Filtrage tolerant aux accents.

### Ouverture

- **Raccourci global** : `⌘K` (macOS) / `Ctrl+K` (Windows/Linux), cable dans le
  shell (`useGlobalShortcuts` de `src/routes/app/route.tsx`).
- **Topbar** : le champ « Rechercher… ⌘K » appelle `palette.open()`.
- **Programmatique** : `useCommandPalette()` -> `{ open, close, toggle, isOpen }`.

### Navigation

- `↑` / `↓` : deplacent la selection (boucle).
- `↵` : declenche l'action active.
- `Echap` : ferme (gere par le Dialog).

### Actions disponibles

- Naviguer vers chacune des 8 pages de la nav.
- « Nouvelle opportunité » -> ouvre la capture rapide.

Le provider `CommandPaletteProvider` doit etre monte **sous**
`QuickCaptureProvider` (il consomme `useQuickCapture`).

---

## 3. Capture rapide (`src/components/app/quick-capture.tsx`)

Sheet lateral droit de creation rapide d'opportunite, ouvrable de partout.
Reutilise le formulaire `OpportunityForm` existant et appelle
`api.opportunities.create` (construction dynamique des args, **jamais**
d'`undefined` cote Convex), toast succes/erreur (sonner).

### Ouverture

- **Raccourci global** : touche `n` (hors champ de saisie), cable dans le shell.
- **Sidebar / Topbar** : bouton « + Nouvelle opportunité ».
- **Palette** : action « Nouvelle opportunité ».
- **Programmatique** : `useQuickCapture()` -> `{ open, close, isOpen }`.

Le provider `QuickCaptureProvider` est monte dans la zone authentifiee du shell
(apres `AuthGate` + `ConvexProviders`), jamais dans `__root.tsx`.

---

## 4. Theme clair/sombre (`src/components/app/theme.tsx`)

Provider **client-only** : lit `localStorage["filon-theme"]` avec fallback sur
la preference systeme, applique/retire `.dark` sur `document.documentElement`
**apres montage** (aucun mismatch d'hydratation, SSR intact, `__root.tsx`
non touche).

- `useTheme()` -> `{ theme, setTheme, toggleTheme, mounted }`.
- `<ThemeToggle />` : bouton icone (lucide `Sun` / `Moon`), place en pied de
  sidebar et dans le menu mobile.

Toutes les couleurs derivent des variables `--color-*` ; le dark mode est deja
defini sous `.dark` dans `app.css`. Ne jamais coder une couleur en dur.

---

## 5. Shell applicatif (`src/routes/app/route.tsx`)

Structure (zone authentifiee) :

```
ThemeProvider
  QuickCaptureProvider
    CommandPaletteProvider
      ShellLayout  (sidebar cockpit + topbar vivante + <Outlet/>)
```

- **Sidebar cockpit** (largeur `w-60`) : groupes a intitules mono (Pilotage,
  Pipeline, Carnet, Réglages), bouton « + Nouvelle opportunité » en tete,
  `ThemeToggle` + `AccountMenu` en pied.
- **Badges live** sur « Relances » : lus depuis `api.dashboard.summary`.
  `followupsOverdue > 0` -> badge **danger** (compte en retard) ; sinon
  `followupsUpcoming > 0` -> badge **accent** (a venir 7 j) ; sinon aucun badge.
- **Topbar** : champ recherche (ouvre la palette), bouton « + Nouvelle
  opportunité », compte (sur mobile).

> ⚠ La logique d'auth (`AppLayout` -> `ConvexProviders` -> `AuthGate` ->
> redirection `/connexion`) est **intouchable**. Seul le visuel autour est libre.

---

## 6. Regles de densite

Tokens ajoutes en fin de `src/styles/app.css` (append only) :

| Token            | Valeur   | Usage |
|------------------|----------|-------|
| `--row-h`        | `2.5rem` (40px)  | Hauteur de ligne de tableau standard. |
| `--row-h-sm`     | `2.25rem` (36px) | Ligne compacte. |
| `--cell-px`      | `0.75rem` (12px) | Padding horizontal de cellule / ligne. |
| `--toolbar-h`    | `4rem` (64px)    | Hauteur topbar / en-tete (aligne `h-16`). |
| `--title-page`   | `1.1875rem` (19px)| Titre de PageToolbar. |
| `--title-section`| `0.9375rem` (15px)| Titre de section. |

Classes utilitaires : `.eyebrow` (intitule de groupe mono, 10px, uppercase,
tracking 0.08em, `text-fg-subtle`), `.row-dense` (ligne de tableau dense).

### Paddings et rythme de reference

- **Contenu de page** : `px-4 py-5` mobile, `md:px-6 lg:px-8` (defini dans le
  shell, ne pas re-padder la racine de page).
- **PageToolbar** : `pb-3` sous le titre, separateur bas `border-border`,
  marge basse `mb-5`.
- **Items de nav** : hauteur `h-9` (dense), `gap-2.5`, `rounded-[var(--radius-sm)]`.
- **Lignes de tableau** : viser `h-10` (`--row-h`), padding `--cell-px`,
  separateur `border-border`, survol `hover:bg-surface-2`.
- **Cartes** : ombre `--shadow-card`, rayon `--radius` ou `--radius-lg`.

### Tailles de titres

- Titre de page : 19px semibold, `tracking-[-0.02em]`.
- Titre de section : 15px semibold.
- Intitule de groupe (eyebrow) : 10px uppercase, tracking 0.08em.

### Etats obligatoires (toute vue de donnees)

- **loading** : skeletons (`Skeleton` / classe `.skeleton`), jamais de spinner
  plein ecran pour une liste.
- **empty** : message + action de creation (ouvrir la capture rapide).
- **error** : message sobre `text-danger`, possibilite de reessayer.
- **success** : toast (sonner) sur chaque mutation.

---

## 7. Pipeline : ordre des etapes + couleurs

Source canonique : `src/components/opportunities/meta.ts` (`STAGES`,
`STAGE_META`). Ne jamais reordonner ni recolorer ailleurs.

### Ordre canonique des etapes

`lead → contacted → applied → interview → negotiation → won → lost`

| Etape         | Libelle FR             | Court    | Token couleur            |
|---------------|------------------------|----------|--------------------------|
| `lead`        | Piste                  | Piste    | `--color-stage-lead`        (zinc/slate) |
| `contacted`   | Contacté               | Contacté | `--color-stage-contacted`   (cyan)  |
| `applied`     | Candidature envoyée    | Envoyée  | `--color-stage-applied`     (indigo/accent) |
| `interview`   | Entretien              | Entretien| `--color-stage-interview`   (violet) |
| `negotiation` | Négociation            | Négo.    | `--color-stage-negotiation` (ambre) |
| `won`         | Gagné                  | Gagné    | `--color-stage-won`         (vert) |
| `lost`        | Perdu                  | Perdu    | `--color-stage-lost`        (rouge) |

Pour chaque etape : `STAGE_META[stage].dot` (pastille `bg-stage-*`) et
`.chip` (`bg-stage-*-soft text-stage-*`). Le changement d'etape inline se fait
via `api.opportunities.setStage` (place en fin de colonne) ou `move` (kanban
avec ordre).

### Types d'opportunite + couleurs

Source : `TYPE_META`. Ordre d'affichage = ordre des cles ci-dessous.

| Type          | Libelle FR     | Icone (lucide) | Token couleur              |
|---------------|----------------|----------------|----------------------------|
| `job_offer`   | Candidature    | `Briefcase`    | `--color-type-application` (indigo) |
| `spontaneous` | Proposition    | `Send`         | `--color-type-pitch`       (cyan) |
| `prospect`    | Prospection    | `Radar`        | `--color-type-prospect`    (violet) |
| `mission`     | Mission        | `Rocket`       | `--color-type-mission`     (vert) |

Helpers de formatage disponibles dans `meta.ts` : `formatDate`,
`formatDateShort`, `formatDateTime`, `dueStatus` (`none|overdue|today|upcoming`).

### Priorites

Source : `PRIORITY_META`. `low` (Basse, neutre), `medium` (Moyenne, info),
`high` (Haute, warning).
