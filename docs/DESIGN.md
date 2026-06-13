# Filon · Système de design

Document de référence pour l'interface de Filon. Monochrome zinc + une seule couleur d'accent (indigo). Light theme par défaut, dark mode propre. Production-grade, jamais de MVP : chaque composant gère loading, empty, error, success.

Stack visuelle : Tailwind CSS v4 (`@tailwindcss/vite`), Radix UI + CVA (shadcn-style), lucide-react. Police via Google Fonts (Inter), titres légèrement plus serrés.

---

## 1. Principes

- **Monochrome + 1 accent.** Toute l'ossature est en zinc (neutres froids). L'indigo est réservé aux actions primaires, aux états actifs, aux focus et aux liens. Jamais deux couleurs d'accent.
- **Sobre, pas clinquant.** Pas de gradient orbs, pas de glassmorphism, pas de bento aléatoire, pas de dark SaaS générique. Surfaces plates, bordures fines, ombres discrètes.
- **Lisible avant tout.** Contraste AA minimum sur tous les textes. Touch targets `>= h-11` (44px).
- **Couleur = information.** Les couleurs sémantiques (succès, alerte, danger) et les couleurs de stage du pipeline sont posées avec parcimonie, en chips sobres (fond très clair + texte saturé), jamais en aplats criards.
- **Mobile-first.** Le kanban scrolle horizontalement sur mobile, colonnes empilables.

---

## 2. Palette

### Accent : indigo

Indigo `#4f46e5` (Tailwind `indigo-600`) retenu comme accent par défaut. C'est un bleu-violet professionnel, neutre en connotation (ni « danger » rouge, ni « validé » vert), qui se marie au zinc froid sans jurer. Conservé tel quel : aucune autre teinte ne sert mieux un outil de pipeline B2B sobre.

| Rôle | Light | Dark |
|---|---|---|
| `accent` (action primaire) | `#4f46e5` | `#6366f1` |
| `accent-hover` | `#4338ca` | `#818cf8` |
| `accent-fg` (texte sur accent) | `#ffffff` | `#0b0b0f` |
| `accent-soft` (fond chip/halo) | `#eef2ff` | `rgba(99,102,241,0.14)` |
| `accent-ring` (focus) | `rgba(79,70,229,0.45)` | `rgba(129,140,248,0.55)` |

### Neutres (zinc)

L'échelle zinc de Tailwind sert de base. En light, le fond app est légèrement plus froid que blanc pur pour reposer l'oeil.

| Token | Light | Dark | Usage |
|---|---|---|---|
| `bg` | `#fafafa` (zinc-50) | `#09090b` (zinc-950) | Fond application |
| `surface` | `#ffffff` | `#18181b` (zinc-900) | Cards, panneaux, modales |
| `surface-2` | `#f4f4f5` (zinc-100) | `#27272a` (zinc-800) | Colonnes kanban, zones en retrait |
| `border` | `#e4e4e7` (zinc-200) | `#27272a` (zinc-800) | Filets, séparateurs |
| `border-strong` | `#d4d4d8` (zinc-300) | `#3f3f46` (zinc-700) | Bordure au hover, inputs focus |
| `fg` | `#18181b` (zinc-900) | `#fafafa` (zinc-50) | Texte principal |
| `fg-muted` | `#52525b` (zinc-600) | `#a1a1aa` (zinc-400) | Texte secondaire |
| `fg-subtle` | `#71717a` (zinc-500) | `#71717a` (zinc-500) | Placeholders, méta, labels |

### Sémantique (statuts)

Fonds très clairs en light, translucides en dark. Texte saturé pour le contraste.

| Token | Light fg / bg | Dark fg / bg |
|---|---|---|
| `success` | `#15803d` / `#f0fdf4` | `#4ade80` / `rgba(34,197,94,0.14)` |
| `warning` | `#b45309` / `#fffbeb` | `#fbbf24` / `rgba(245,158,11,0.14)` |
| `danger` | `#b91c1c` / `#fef2f2` | `#f87171` / `rgba(239,68,68,0.14)` |
| `info` | `#4338ca` / `#eef2ff` | `#818cf8` / `rgba(99,102,241,0.14)` |

---

## 3. Couleurs du pipeline (stages)

Chaque stage du kanban a une teinte d'identification, posée uniquement sur le point/la barre de colonne et la chip de stage. **Le corps des cards reste neutre (surface)** : la couleur sert de repère, pas de décoration. Progression visuelle du gris froid (piste) vers le vert (gagné), le rouge isolé pour perdu.

| Stage (FR) | clé | Light dot/fg / chip-bg | Dark dot/fg / chip-bg |
|---|---|---|---|
| Piste | `lead` | `#64748b` / `#f1f5f9` | `#94a3b8` / `rgba(148,163,184,0.14)` |
| Contacté | `contacted` | `#0891b2` / `#ecfeff` | `#22d3ee` / `rgba(34,211,238,0.14)` |
| Candidature envoyée | `applied` | `#4f46e5` / `#eef2ff` | `#818cf8` / `rgba(99,102,241,0.14)` |
| Entretien | `interview` | `#7c3aed` / `#f5f3ff` | `#a78bfa` / `rgba(167,139,250,0.14)` |
| Négociation | `negotiation` | `#b45309` / `#fffbeb` | `#fbbf24` / `rgba(245,158,11,0.14)` |
| Gagné | `won` | `#15803d` / `#f0fdf4` | `#4ade80` / `rgba(34,197,94,0.14)` |
| Perdu | `lost` | `#b91c1c` / `#fef2f2` | `#f87171` / `rgba(239,68,68,0.14)` |

## 4. Couleurs par type d'opportunité

Le type est une chip discrète (contour + texte teinté, fond `surface`), distincte des chips de stage pour éviter la confusion. Icône lucide associée.

| Type (FR) | clé | Couleur fg | Icône lucide |
|---|---|---|---|
| Candidature | `application` | `#4f46e5` (indigo) | `briefcase` |
| Proposition spontanée | `pitch` | `#0891b2` (cyan) | `send` |
| Prospection freelance | `prospect` | `#7c3aed` (violet) | `radar` |
| Mission en cours | `mission` | `#15803d` (vert) | `rocket` |

---

## 5. Typographie

- **Famille** : Inter (`var(--font-sans)`), fallback `system-ui`. Variable font, poids 400/500/600/700.
- **Titres** : interlettrage légèrement serré (`-0.02em` sur `text-2xl`+), poids 600/700.
- **Corps** : 15-16px, `line-height` 1.55, poids 400. Texte muted en 500 pour compenser le contraste.
- **Méta / labels** : 12-13px, poids 500, parfois `uppercase` + `tracking-wide` (0.06em) pour les en-têtes de colonnes et badges.
- **Chiffres dashboard** : `tabular-nums` (`font-variant-numeric`), poids 600.

| Rôle | Taille | Poids | Tracking |
|---|---|---|---|
| Display (hero landing) | `clamp(2.2rem, 6vw, 4rem)` | 700 | -0.03em |
| Titre page | `text-2xl` (1.5rem) | 600 | -0.02em |
| Titre section / card | `text-base`/`text-lg` | 600 | -0.01em |
| Corps | `text-sm`/`text-base` | 400 | 0 |
| Méta / label | `text-xs` | 500 | 0.02em (0.06em si uppercase) |

Import (dans `app.css`) :
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
```

---

## 6. Échelle d'espacement, rayons, ombres

On suit l'échelle Tailwind par défaut (base 4px). Conventions d'usage :

- **Padding card** : `p-4` (16px) mobile, `p-5` desktop.
- **Gap colonnes kanban** : `gap-4` (16px). **Gap cards dans une colonne** : `gap-2.5` (10px).
- **Padding page** : `px-4` mobile, `px-6`/`px-8` desktop. `max-w-screen-2xl` centré.
- **Rayons** : `--radius: 0.625rem` (10px) pour cards/inputs/boutons, `lg` = 12px (panneaux/modales), `sm` = 6px (chips/badges), `full` (pills, avatars).
- **Ombres** : discrètes, jamais diffuses.
  - `shadow-card` : `0 1px 2px rgba(24,24,27,0.04), 0 12px 28px -20px rgba(24,24,27,0.18)`
  - `shadow-pop` (menus, popovers, card en drag) : `0 8px 24px -8px rgba(24,24,27,0.20)`
  - En dark, ombres remplacées par une bordure `border` plus marquée (les ombres ne se voient pas sur fond noir).

Transitions : `cubic-bezier(0.22, 1, 0.36, 1)`, durées 150-300ms. `prefers-reduced-motion` respecté (durées ramenées à ~0).

---

## 7. Composants

### Boutons (CVA, shadcn-style)

| Variante | Light | Usage |
|---|---|---|
| `default` (primaire) | fond `accent`, texte `accent-fg`, hover `accent-hover` | Action principale (1 par vue) |
| `secondary` | fond `surface-2`, texte `fg`, bordure `border` | Action secondaire |
| `outline` | fond transparent, bordure `border`, hover `surface-2` | Actions discrètes |
| `ghost` | transparent, hover `surface-2` | Icônes, items de liste, toolbar |
| `destructive` | texte `danger`, hover `danger` bg-soft | Suppression (toujours via Dialog Radix) |

Hauteurs : `sm` h-9, `default` h-11 (44px, défaut mobile), `lg` h-12. Icon-only : carré `h-11 w-11`. Focus : `ring-2 ring-accent-ring ring-offset-2`.

### Cards d'opportunité (kanban)

```
surface · border · rounded-[--radius] · p-4 · shadow-card
hover : border-strong, translateY(-1px), shadow-pop
drag  : shadow-pop, légère rotation (1deg), opacity colonne source réduite
```
Contenu : titre (entreprise + intitulé, 2 lignes max, `line-clamp-2`), chip de type, ligne méta (montant estimé `tabular-nums` + date de relance), pied avec avatar contact + badge de relance (point coloré : à venir = `fg-subtle`, aujourd'hui = `warning`, en retard = `danger`).

### Chips & badges

- **Chip de stage** : `inline-flex h-6 px-2.5 rounded-full text-xs font-medium`, fond `{stage}-soft`, texte `{stage}-fg`, point coloré 6px en préfixe.
- **Chip de type** : `rounded-md border text-xs`, bordure `border`, texte teinté du type, icône lucide 14px.
- **Badge relance** : pill `text-xs`, sémantique (warning/danger) ou neutre.
- Tous : `whitespace-nowrap`, `gap-1.5`.

### Inputs / champs

```
h-11 · w-full · surface · border · rounded-[--radius] · px-3 · text-sm
focus : border-strong + ring-2 ring-accent-ring (ring-offset bg)
placeholder : fg-subtle
error : border danger + ring danger-soft, message text-xs danger dessous
```
Toujours un `<label>` `text-sm font-medium` associé. Select / Combobox / Datepicker via Radix.

### Toasts

Coin bas-droite (mobile : haut, pleine largeur). `surface`, `border`, `shadow-pop`, icône sémantique à gauche (lucide `check-circle` / `alert-triangle` / `x-circle`). Auto-dismiss 4s, action « Annuler » optionnelle. Un toast sur **chaque** action (création, déplacement de stage, relance planifiée, suppression).

### Dialog / AlertDialog (Radix)

Overlay `rgba(9,9,11,0.55)` + `surface` centré `rounded-lg shadow-pop max-w-md`. Jamais de `window.confirm`/`alert`. Suppression = AlertDialog avec bouton `destructive`.

---

## 8. Colonnes kanban

```
Colonne :
  surface-2 · rounded-lg · p-3 · min-w-[300px] · flex flex-col gap-2.5
  En-tête : barre/point de couleur {stage} + libellé (text-sm font-semibold)
            + compteur (text-xs fg-subtle tabular-nums) + bouton ghost "+" (ajout rapide)
  Corps   : scroll vertical interne, drop-zone (surbrillance accent-soft + bordure dashed accent au survol drag)
```
- Le conteneur kanban scrolle horizontalement (`overflow-x-auto`, `snap-x` sur mobile).
- Colonne « Perdu » repliable / dé-emphasée (opacity légèrement réduite au repos).
- Drag-and-drop : la card prend `shadow-pop` + 1deg de rotation ; la drop-zone valide s'illumine en `accent-soft`.

---

## 9. États empty / loading / error

Production-grade : chaque vue gère les 4 états.

- **Loading** : skeletons (blocs `surface-2` avec `animate-pulse`), jamais de spinner plein écran. Le kanban affiche 3 colonnes de 2-3 cards-skeleton.
- **Empty (colonne)** : zone discrète centrée, icône lucide 20px `fg-subtle`, libellé `text-sm fg-muted` (ex. « Aucune opportunité ici ») + lien d'ajout.
- **Empty (première utilisation)** : illustration sobre (icône `compass`/`radar` dans cercle `accent-soft`), titre `text-lg font-semibold`, sous-texte `fg-muted`, bouton primaire « Ajouter une opportunité ».
- **Error** : encart `danger` `bg-soft` + bordure, icône `alert-triangle`, message clair en FR + bouton « Réessayer ».
- **Success** : toast + mise à jour optimiste de l'UI.

---

## 10. Tokens Tailwind v4 (`@theme`) — prêts à coller

À placer dans `src/styles/app.css`. Tailwind v4 : `@theme` génère les utilitaires (`bg-surface`, `text-fg-muted`, `border-border`, etc.). Le dark mode est piloté par la classe `.dark` sur `<html>`.

```css
@import "tailwindcss";

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* Variante dark pilotée par la classe .dark (et non prefers-color-scheme seul) */
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;

  --radius: 0.625rem;
  --radius-sm: 0.375rem;
  --radius-lg: 0.75rem;

  /* Accent (indigo) */
  --color-accent: #4f46e5;
  --color-accent-hover: #4338ca;
  --color-accent-fg: #ffffff;
  --color-accent-soft: #eef2ff;
  --color-accent-ring: oklch(0.55 0.21 277 / 0.45);

  /* Neutres */
  --color-bg: #fafafa;
  --color-surface: #ffffff;
  --color-surface-2: #f4f4f5;
  --color-border: #e4e4e7;
  --color-border-strong: #d4d4d8;
  --color-fg: #18181b;
  --color-fg-muted: #52525b;
  --color-fg-subtle: #71717a;

  /* Sémantique */
  --color-success: #15803d;
  --color-success-soft: #f0fdf4;
  --color-warning: #b45309;
  --color-warning-soft: #fffbeb;
  --color-danger: #b91c1c;
  --color-danger-soft: #fef2f2;
  --color-info: #4338ca;
  --color-info-soft: #eef2ff;

  /* Stages du pipeline (fg + soft) */
  --color-stage-lead: #64748b;
  --color-stage-lead-soft: #f1f5f9;
  --color-stage-contacted: #0891b2;
  --color-stage-contacted-soft: #ecfeff;
  --color-stage-applied: #4f46e5;
  --color-stage-applied-soft: #eef2ff;
  --color-stage-interview: #7c3aed;
  --color-stage-interview-soft: #f5f3ff;
  --color-stage-negotiation: #b45309;
  --color-stage-negotiation-soft: #fffbeb;
  --color-stage-won: #15803d;
  --color-stage-won-soft: #f0fdf4;
  --color-stage-lost: #b91c1c;
  --color-stage-lost-soft: #fef2f2;

  /* Types d'opportunité */
  --color-type-application: #4f46e5;
  --color-type-pitch: #0891b2;
  --color-type-prospect: #7c3aed;
  --color-type-mission: #15803d;

  /* Ombres */
  --shadow-card: 0 1px 2px rgba(24,24,27,0.04), 0 12px 28px -20px rgba(24,24,27,0.18);
  --shadow-pop: 0 8px 24px -8px rgba(24,24,27,0.20);

  --ease-out-soft: cubic-bezier(0.22, 1, 0.36, 1);
}

/* Overrides dark mode : on réassigne les mêmes variables sous .dark */
.dark {
  --color-accent: #6366f1;
  --color-accent-hover: #818cf8;
  --color-accent-fg: #0b0b0f;
  --color-accent-soft: oklch(0.55 0.21 277 / 0.14);
  --color-accent-ring: oklch(0.7 0.16 277 / 0.55);

  --color-bg: #09090b;
  --color-surface: #18181b;
  --color-surface-2: #27272a;
  --color-border: #27272a;
  --color-border-strong: #3f3f46;
  --color-fg: #fafafa;
  --color-fg-muted: #a1a1aa;
  --color-fg-subtle: #71717a;

  --color-success: #4ade80;
  --color-success-soft: rgba(34,197,94,0.14);
  --color-warning: #fbbf24;
  --color-warning-soft: rgba(245,158,11,0.14);
  --color-danger: #f87171;
  --color-danger-soft: rgba(239,68,68,0.14);
  --color-info: #818cf8;
  --color-info-soft: rgba(99,102,241,0.14);

  --color-stage-lead: #94a3b8;
  --color-stage-lead-soft: rgba(148,163,184,0.14);
  --color-stage-contacted: #22d3ee;
  --color-stage-contacted-soft: rgba(34,211,238,0.14);
  --color-stage-applied: #818cf8;
  --color-stage-applied-soft: rgba(99,102,241,0.14);
  --color-stage-interview: #a78bfa;
  --color-stage-interview-soft: rgba(167,139,250,0.14);
  --color-stage-negotiation: #fbbf24;
  --color-stage-negotiation-soft: rgba(245,158,11,0.14);
  --color-stage-won: #4ade80;
  --color-stage-won-soft: rgba(34,197,94,0.14);
  --color-stage-lost: #f87171;
  --color-stage-lost-soft: rgba(239,68,68,0.14);

  --color-type-application: #818cf8;
  --color-type-pitch: #22d3ee;
  --color-type-prospect: #a78bfa;
  --color-type-mission: #4ade80;

  --shadow-card: 0 0 0 1px #27272a;
  --shadow-pop: 0 8px 24px -8px rgba(0,0,0,0.6), 0 0 0 1px #3f3f46;
}

@layer base {
  * { border-color: var(--color-border); }
  html {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    color-scheme: light;
  }
  html.dark { color-scheme: dark; }
  body {
    background: var(--color-bg);
    color: var(--color-fg);
    font-family: var(--font-sans);
    font-size: 15px;
    line-height: 1.55;
  }
  ::selection { background: var(--color-accent-soft); color: var(--color-accent); }
  :focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
    border-radius: 3px;
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
}

@layer components {
  /* Pulse skeleton sobre */
  .skeleton {
    background: var(--color-surface-2);
    border-radius: var(--radius-sm);
    animation: skeleton-pulse 1.5s ease-in-out infinite;
  }
  @keyframes skeleton-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }
}
```

> Note d'intégration : utiliser `clsx` + `tailwind-merge` (helper `cn`) pour composer les variantes CVA. Le toggle dark/light ajoute/retire la classe `.dark` sur `document.documentElement` (préférence persistée en `localStorage`, défaut = light).
