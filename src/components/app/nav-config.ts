import {
  LayoutDashboard,
  Briefcase,
  Rss,
  Building2,
  Send,
  BellRing,
  FileText,
  Settings,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

/**
 * Source unique de la navigation de l'espace de travail Filon.
 *
 * Partagee par la sidebar (groupes visuels) et la palette de commandes
 * (cibles de navigation), pour eviter toute divergence entre les deux.
 */

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  /** Comparaison stricte de chemin (vrai pour le tableau de bord racine). */
  exact: boolean
  /** Mots-cles supplementaires pour le filtrage de la palette. */
  keywords?: string
}

export type NavGroup = {
  title: string
  items: NavItem[]
}

/** Navigation regroupee par domaine, avec petits intitules. */
export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Pilotage',
    items: [
      {
        to: '/app',
        label: 'Tableau de bord',
        icon: LayoutDashboard,
        exact: true,
        keywords: 'dashboard accueil pilotage synthese',
      },
    ],
  },
  {
    title: 'Pipeline',
    items: [
      {
        to: '/app/opportunites',
        label: 'Opportunités',
        icon: Briefcase,
        exact: false,
        keywords:
          'pistes candidatures missions offres pipeline kanban tableau liste calendrier',
      },
      {
        to: '/app/veille',
        label: 'Veille',
        icon: Rss,
        exact: false,
        keywords: 'import offres educarriere surveillance recherche',
      },
    ],
  },
  {
    title: 'Carnet',
    items: [
      {
        to: '/app/entreprises',
        label: 'Entreprises',
        icon: Building2,
        exact: false,
        keywords: 'societes companies carnet contacts',
      },
      {
        to: '/app/propositions',
        label: 'Propositions',
        icon: Send,
        exact: false,
        keywords: 'pitch demarchage proposals prospection',
      },
      {
        to: '/app/relances',
        label: 'Relances',
        icon: BellRing,
        exact: false,
        keywords: 'followups rappels echeances suivis',
      },
      {
        to: '/app/documents',
        label: 'Documents',
        icon: FileText,
        exact: false,
        keywords: 'cv lettres portfolio fichiers pieces',
      },
    ],
  },
  {
    title: 'Réglages',
    items: [
      {
        to: '/app/tarifs',
        label: 'Tarifs & abonnement',
        icon: Sparkles,
        exact: false,
        keywords: 'tarifs abonnement plan palier pro premium upgrade paystack facturation',
      },
      {
        to: '/app/parametres',
        label: 'Paramètres',
        icon: Settings,
        exact: false,
        keywords: 'reglages settings preferences compte',
      },
    ],
  },
]

/** Liste a plat de toutes les cibles de navigation (pour la palette). */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items)

/** Vrai si `pathname` correspond a l'item (exact ou prefixe de section). */
export function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.to
  return pathname === item.to || pathname.startsWith(`${item.to}/`)
}
