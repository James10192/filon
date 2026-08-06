import {
  LayoutDashboard,
  Bot,
  Briefcase,
  Rss,
  Inbox,
  Handshake,
  ClipboardList,
  UsersRound,
  ChartNoAxesCombined,
  Building2,
  Send,
  BellRing,
  FileText,
  Gift,
  Settings,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { m } from '~/lib/paraglide/messages'

/**
 * Source unique de la navigation de l'espace de travail Filon.
 *
 * Partagee par la sidebar (groupes visuels) et la palette de commandes
 * (cibles de navigation), pour eviter toute divergence entre les deux.
 *
 * Les intitules sont des fonctions de message Paraglide (`() => string`),
 * resolues au point de rendu pour suivre la langue active.
 */

export type NavItem = {
  to: string
  label: () => string
  icon: LucideIcon
  /** Comparaison stricte de chemin (vrai pour le tableau de bord racine). */
  exact: boolean
  /** Mots-cles supplementaires pour le filtrage de la palette. */
  keywords?: string
}

export type NavGroup = {
  title: () => string
  items: NavItem[]
}

/** Navigation regroupee par domaine, avec petits intitules. */
export const NAV_GROUPS: NavGroup[] = [
  {
    title: () => 'Espace de travail',
    items: [
      {
        to: '/app',
        label: () => "Aujourd'hui",
        icon: LayoutDashboard,
        exact: true,
        keywords: 'aujourdhui accueil actions priorites',
      },
      {
        to: '/app/captures',
        label: () => 'Captures',
        icon: Inbox,
        exact: false,
        keywords: 'captures inbox veille import pistes a qualifier',
      },
    ],
  },
  {
    title: () => 'Développement',
    items: [
      {
        to: '/app/relations',
        label: () => 'Relations',
        icon: Handshake,
        exact: false,
        keywords: 'contacts entreprises relation partage historique besoins actions',
      },
      {
        to: '/app/besoins',
        label: () => 'Besoins',
        icon: ClipboardList,
        exact: false,
        keywords: 'besoins qualification version offre probleme priorite',
      },
      {
        to: '/app/deals',
        label: () => 'Deals',
        icon: Briefcase,
        exact: false,
        keywords: 'deals pipeline prospection negociation closing opportunites',
      },
      {
        to: '/app/clients',
        label: () => 'Clients',
        icon: UsersRound,
        exact: false,
        keywords: 'clients onboarding satisfaction renouvellement upsell reactivation',
      },
      {
        to: '/app/analyses',
        label: () => 'Analyses',
        icon: ChartNoAxesCombined,
        exact: false,
        keywords: 'analyses conversion prevision activite performance',
      },
      {
        to: '/app/copilot',
        label: m.nav_copilot,
        icon: Bot,
        exact: false,
        keywords: 'copilot copilote ia agent intelligence assistant chat',
      },
    ],
  },
  {
    title: m.nav_group_carnet,
    items: [
      {
        to: '/app/entreprises',
        label: m.carnet_page_title,
        icon: Building2,
        exact: false,
        keywords: 'carnet entreprises societes companies contacts particuliers adresses',
      },
      {
        to: '/app/opportunites',
        label: m.nav_opportunities,
        icon: Briefcase,
        exact: false,
        keywords: 'ancienne vue opportunites pipeline tableau liste calendrier',
      },
      {
        to: '/app/veille',
        label: m.nav_watch,
        icon: Rss,
        exact: false,
        keywords: 'veille import offres surveillance recherche',
      },
      {
        to: '/app/propositions',
        label: m.nav_proposals,
        icon: Send,
        exact: false,
        keywords: 'pitch demarchage proposals prospection',
      },
      {
        to: '/app/relances',
        label: m.nav_followups,
        icon: BellRing,
        exact: false,
        keywords: 'followups rappels echeances suivis',
      },
      {
        to: '/app/documents',
        label: m.nav_documents,
        icon: FileText,
        exact: false,
        keywords: 'cv lettres portfolio fichiers pieces',
      },
    ],
  },
  {
    title: m.nav_group_reglages,
    items: [
      {
        to: '/app/organisation',
        label: m.nav_organisation,
        icon: Users,
        exact: false,
        keywords:
          'organisation equipe team membres roles head sell commercial sdr metriques priorites',
      },
      {
        to: '/app/parrainage',
        label: m.nav_referral,
        icon: Gift,
        exact: false,
        keywords: 'parrainage affiliation filleul lien recompense mois offert referral invite',
      },
      {
        to: '/app/tarifs',
        label: m.nav_pricing_plan,
        icon: Sparkles,
        exact: false,
        keywords: 'tarifs abonnement plan palier pro premium upgrade paystack facturation',
      },
      {
        to: '/app/parametres',
        label: m.nav_settings,
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
