import type { PaidPlan } from '~/lib/billing/plan'

/**
 * Catalogue déclaratif des paliers pour la page Tarifs (libellés + arguments).
 * Données pures, pas de logique. Les prix viennent de `convex/lib/pricing.ts`
 * (source unique). Les limites chiffrées viennent de `convex/lib/plan.ts`.
 */

export type PlanKey = 'free' | PaidPlan | 'team'

export type PlanCard = {
  key: PlanKey
  name: string
  tagline: string
  /** Palier mis en avant (bordure accent, badge « Recommandé »). */
  featured?: boolean
  /** Arguments clés affichés sous le prix. */
  features: string[]
}

export const PLAN_CARDS: PlanCard[] = [
  {
    key: 'free',
    name: 'Découverte',
    tagline: 'Pour démarrer votre prospection, sans frais.',
    features: [
      "Jusqu'à 25 opportunités actives",
      '1 recherche de veille (surveillance manuelle)',
      'Import manuel des offres',
      'Pipeline, vues Liste / Tableau / Calendrier',
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    tagline: 'Pour prospecter sans limite et automatiser la veille.',
    featured: true,
    features: [
      'Opportunités illimitées',
      'Veille automatique + recherches multiples',
      'Relances, analytique, export',
      'Toutes les vues, sans plafond',
    ],
  },
  {
    key: 'pro_ai',
    name: 'Pro+ IA',
    tagline: "Tout Pro, plus l'assistance par IA à l'acte.",
    features: [
      'Tout le palier Pro',
      'Scoring de pertinence des opportunités',
      'Brouillons lettre / e-mail / CV ciblés',
      '300 crédits IA par mois, au-delà à la recharge',
    ],
  },
  {
    key: 'copilot',
    name: 'Copilot',
    tagline: "L'agent IA qui agit sur votre pipeline.",
    features: [
      'Tout le palier Pro+ IA',
      'Copilote agentique : il analyse et agit (créer, relancer, rédiger)',
      'Historique des conversations + journal des actions',
      'Quota IA généreux en usage loyal, sans mur dur',
      'Clé API perso (BYOK) en option',
    ],
  },
  {
    key: 'team',
    name: 'Équipe',
    tagline: 'Pour les agences et équipes partageant un pipeline.',
    features: [
      'Pipeline partagé entre membres',
      'Rôles et invitations',
      'Facturation par siège',
      'Accompagnement dédié',
    ],
  },
]

/** Tableau comparatif : lignes de fonctionnalités × paliers. */
export type CompareRow = {
  label: string
  free: string | boolean
  pro: string | boolean
  pro_ai: string | boolean
  copilot: string | boolean
}

export const COMPARE_ROWS: CompareRow[] = [
  { label: 'Opportunités actives', free: '25', pro: 'Illimité', pro_ai: 'Illimité', copilot: 'Illimité' },
  { label: 'Recherches de veille', free: '1', pro: 'Illimité', pro_ai: 'Illimité', copilot: 'Illimité' },
  { label: 'Veille automatique (moniteur)', free: false, pro: true, pro_ai: true, copilot: true },
  { label: 'Vues Liste / Tableau / Calendrier', free: true, pro: true, pro_ai: true, copilot: true },
  { label: 'Relances et analytique', free: false, pro: true, pro_ai: true, copilot: true },
  { label: 'Export des données', free: false, pro: true, pro_ai: true, copilot: true },
  { label: 'Crédits IA inclus / mois', free: '25', pro: '100', pro_ai: '300', copilot: '6000' },
  { label: 'Scoring de pertinence (IA)', free: false, pro: false, pro_ai: true, copilot: true },
  { label: 'Brouillons lettre / e-mail / CV (IA)', free: false, pro: false, pro_ai: true, copilot: true },
  { label: 'Copilote agentique (chat + actions)', free: false, pro: false, pro_ai: false, copilot: true },
  { label: 'Historique + journal des actions', free: false, pro: false, pro_ai: false, copilot: true },
  { label: 'Usage loyal sans mur dur · BYOK', free: false, pro: false, pro_ai: false, copilot: true },
]
