---
name: Filon
description: Tour de contrôle précise et fiable du cycle complet des opportunités de revenu.
colors:
  primary: "#4f46e5"
  primary-hover: "#4338ca"
  primary-soft: "#eef2ff"
  background: "#fafafa"
  surface: "#ffffff"
  surface-subtle: "#f4f4f5"
  border: "#e4e4e7"
  border-strong: "#d4d4d8"
  ink: "#18181b"
  ink-muted: "#52525b"
  ink-subtle: "#71717a"
  success: "#15803d"
  success-soft: "#f0fdf4"
  warning: "#b45309"
  warning-soft: "#fffbeb"
  danger: "#b91c1c"
  danger-soft: "#fef2f2"
  stage-lead: "#64748b"
  stage-contacted: "#0891b2"
  stage-interview: "#7c3aed"
typography:
  display:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 7vw, 5rem)"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "0"
  label:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0"
  assay:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "-0.01em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  3xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "44px"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "44px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "44px"
  badge:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 10px"
    height: "24px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "20px"
---

# Design System: Filon

## 1. Overview

**Creative North Star: "La tour de contrôle des revenus"**

Filon est un instrument de pilotage dense, calme et décisif. Chaque écran organise le travail autour d'une prochaine action, d'un risque ou d'une preuve, pour rendre visible la continuité entre la première piste et l'encaissement vérifié. La densité est assumée lorsqu'elle réduit les changements de contexte, mais chaque niveau d'information doit garder une hiérarchie nette.

Le système repose sur des surfaces zinc, un accent indigo rare et des composants shadcn familiers. Il rejette les interfaces SaaS génériques, les accumulations de cartes sans hiérarchie, les informations simplement déposées sur l'écran et toute décoration gratuite. Les adaptations métier passent par les données, les statuts et les libellés, jamais par une identité visuelle différente pour chaque profession.

**Key Characteristics:**

- Densité professionnelle structurée par la décision suivante.
- Monochrome zinc et indigo réservé à l'action ou à la sélection.
- Hanken Grotesk pour l'interface, JetBrains Mono pour les chiffres et les preuves.
- Composants familiers, états explicites et cibles tactiles de 44 px minimum.
- Responsive structurel : navigation repliée, actions regroupées et données recomposées.

**The Next Action Rule.** Un écran n'est terminé que lorsque l'action suivante, le blocage principal ou l'état final est immédiatement identifiable.

## 2. Colors

La palette associe un indigo de décision à des surfaces zinc froides. Les teintes sémantiques et les couleurs du pipeline transportent de l'information ; elles ne décorent jamais la structure.

### Primary

- **Indigo de décision** : action principale, sélection active, lien important et focus clavier.
- **Indigo de décision profond** : survol des actions principales, jamais comme second accent.
- **Indigo de repérage** : fond discret des sélections et statuts liés à l'accent.

### Secondary

- **Vert de confirmation** : réussite, opportunité gagnée et paiement confirmé.
- **Ambre de vigilance** : échéance, paiement partiel et élément à vérifier.
- **Rouge d'interruption** : erreur, retard critique, litige et action destructive.

### Tertiary

- **Ardoise de piste** : première étape du pipeline.
- **Cyan de contact** : prise de contact et progression relationnelle.
- **Violet d'entretien** : étape d'entretien, sans devenir une couleur d'accent générale.

### Neutral

- **Zinc d'atelier** : fond général légèrement distinct du blanc.
- **Surface de travail** : cartes, panneaux, champs et fenêtres de dialogue.
- **Plan secondaire** : zones en retrait, survols et regroupements.
- **Filet structurel** : séparateurs et contours à un pixel.
- **Encre de contrôle** : texte principal à fort contraste.
- **Encre secondaire** : descriptions et métadonnées lisibles.

**The One Accent Rule.** L'indigo est le seul accent de marque. Il occupe moins de 10 % d'un écran produit et ne concurrence jamais les couleurs de statut.

**The Color Means State Rule.** Une couleur vive doit toujours pouvoir être expliquée par une action, une sélection, une étape ou un statut.

## 3. Typography

**Display Font:** Hanken Grotesk (avec `system-ui`)

**Body Font:** Hanken Grotesk (avec `system-ui`)

**Label/Mono Font:** JetBrains Mono (avec `ui-monospace`)

**Character:** Hanken Grotesk donne une voix précise et humaine à l'outil sans introduire une police d'affichage étrangère dans l'application. JetBrains Mono transforme les montants, dates, compteurs et identifiants en relevés vérifiables.

### Hierarchy

- **Display** (700, échelle responsive réservée à la landing, hauteur 1.02) : promesse principale de la marque, jamais dans les panneaux applicatifs.
- **Headline** (600, 19 px, hauteur 1.25) : titre unique d'une page applicative.
- **Title** (600, 16 px, hauteur 1.4) : section, carte ou groupe de travail.
- **Body** (400, 15 px, hauteur 1.55) : contenu courant, limité à 65-75 caractères pour les paragraphes.
- **Label** (500, 12 px) : métadonnées, libellés courts et badges, sans capitales espacées répétées.
- **Assay** (500, 12 px, chiffres tabulaires) : montants, dates relatives, compteurs et références.

**The Instrument Type Rule.** Les valeurs mesurables utilisent JetBrains Mono ; les décisions et explications utilisent Hanken Grotesk.

**The Product Scale Rule.** Les titres de l'application ont une taille fixe. Les échelles fluides sont réservées à la landing publique.

## 4. Elevation

L'élévation est structurelle et presque plate. Les différences de surface et les bordures fines organisent la majorité des écrans. Une ombre n'apparaît que lorsqu'un élément est réellement au-dessus du flux, doit être saisi, déplacé ou distingué du fond. En thème sombre, les bordures renforcées remplacent la plupart des ombres.

### Shadow Vocabulary

- **Carte basse** (`0 1px 2px rgba(24,24,27,0.04), 0 12px 28px -20px rgba(24,24,27,0.18)`) : uniquement pour une entité autonome qui doit se détacher légèrement.
- **Surface élevée** (`0 8px 24px -8px rgba(24,24,27,0.20)`) : menu, popover, dialogue ou élément en déplacement.

**The Flat-by-Default Rule.** Une bordure et une ombre large ne doivent pas décorer simultanément un composant. Les sections ordinaires restent sans ombre.

## 5. Components

Les composants sont compacts, familiers et assurés. Chaque primitive interactive couvre les états par défaut, survol, focus, actif, désactivé, chargement et erreur lorsqu'ils s'appliquent.

### Buttons

- **Shape:** rectangle doucement arrondi (8 px), hauteur standard de 44 px.
- **Primary:** fond Indigo de décision, texte blanc, espacement horizontal de 16 px ; une action principale dominante par vue.
- **Hover / Focus:** indigo plus profond au survol ; anneau indigo de 2 px avec décalage de 2 px au clavier ; transition de 150 ms.
- **Secondary / Ghost / Tertiary:** surface zinc pour le secondaire, contour fin pour l'outline, aucun fond au repos pour le ghost. Le destructif reste rouge sur fond transparent avant interaction.

### Chips

- **Style:** hauteur de 24 px, rayon de 6 px, texte de 12 px et espacement horizontal de 10 px.
- **State:** fond doux et texte saturé pour les statuts ; contour neutre pour une information non sélectionnée. Une icône ne remplace jamais le libellé essentiel.

### Cards / Containers

- **Corner Style:** coins modérément arrondis (12 px).
- **Background:** Surface de travail sur Zinc d'atelier.
- **Shadow Strategy:** aucune ombre pour une simple section ; Carte basse uniquement pour une entité réellement autonome.
- **Border:** filet structurel d'un pixel.
- **Internal Padding:** 16 px pour les blocs denses, 20 px pour les cartes standard.

### Inputs / Fields

- **Style:** hauteur de 44 px, surface blanche, contour zinc, rayon de 8 px et texte de 14 px.
- **Focus:** contour renforcé et anneau indigo de 2 px ; aucun déplacement de mise en page.
- **Error / Disabled:** bordure rouge et message adjacent pour l'erreur ; opacité réduite et curseur interdit pour l'état désactivé.

### Navigation

La navigation utilise Hanken Grotesk à 14 px, des icônes Lucide de 16 px et des lignes compactes. L'élément actif reçoit un fond indigo doux et un texte indigo ; les éléments inactifs restent neutres. Sur mobile, la navigation devient un panneau accessible sans modifier la hiérarchie des destinations.

### Page Toolbar

Chaque page applicative commence par un titre de 19 px, un sous-titre facultatif et un groupe d'actions aligné. Les filtres vivent sur une seconde ligne. La barre utilise un séparateur inférieur, pas une carte englobante, afin de laisser les données commencer immédiatement.

### Data and Recovery Rows

Les dossiers, relances et preuves se présentent d'abord comme des lignes structurées ou des groupes de travail. Les cartes sont réservées aux entités qui ont plusieurs actions ou une identité propre. Le statut, le solde et l'action suivante forment la première lecture.

## 6. Do's and Don'ts

### Do:

- **Do** organiser chaque écran autour de la prochaine décision, du risque principal ou de la preuve attendue.
- **Do** utiliser l'Indigo de décision uniquement pour les actions principales, les sélections et le focus.
- **Do** utiliser JetBrains Mono avec chiffres tabulaires pour les montants, dates, compteurs et références.
- **Do** conserver des cibles tactiles d'au moins 44 px pour les actions principales et vérifier WCAG 2.2 AA.
- **Do** fournir les états chargement, vide, erreur et succès avec une action de reprise claire.
- **Do** utiliser les composants shadcn existants et la même grammaire de contrôles sur toutes les pages.

### Don't:

- **Don't** produire une interface SaaS générique.
- **Don't** créer une accumulation de cartes sans hiérarchie.
- **Don't** construire un écran où les informations semblent simplement déposées.
- **Don't** ajouter de décoration gratuite, d'effet sans fonction ou de composition immédiatement reconnaissable comme générée par IA.
- **Don't** utiliser de texte en dégradé, de glassmorphism, d'orbes, de bento décoratif ou de grille de fond.
- **Don't** utiliser une bordure latérale colorée épaisse comme accent de carte ou d'alerte.
- **Don't** répéter de petits titres en capitales espacées au-dessus de chaque section.
- **Don't** combiner une bordure décorative et une ombre diffuse de plus de 8 px sur le même composant.
- **Don't** utiliser une police d'affichage dans les boutons, libellés, tableaux ou données.
- **Don't** transmettre une information importante uniquement par la couleur.
