import {
  Briefcase,
  Building2,
  GraduationCap,
  HeartHandshake,
  Home,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { m } from '~/lib/paraglide/messages'

/**
 * Catalogue des profils d'activite proposes a l'onboarding. Modele FLEXIBLE et
 * generique : chaque profil pre-remplit un jeu d'etiquettes par defaut adaptees.
 * La valeur stockee (`value`) est libre cote backend (`users.activityType`).
 */
export type ActivityProfile = {
  value: string
  label: () => string
  hint: () => string
  icon: LucideIcon
  /** Etiquettes pre-creees a la fin de l'onboarding pour ce profil. */
  defaultTags: string[]
}

export const ACTIVITY_PROFILES: ActivityProfile[] = [
  {
    value: 'freelance_dev',
    label: m.app_activity_freelance_dev_label,
    hint: m.app_activity_freelance_dev_hint,
    icon: Briefcase,
    defaultTags: ['Client', 'Mission', 'Prospect', 'Recommandation'],
  },
  {
    value: 'consultant',
    label: m.app_activity_consultant_label,
    hint: m.app_activity_consultant_hint,
    icon: Sparkles,
    defaultTags: ['Client', 'Prospect', 'Partenaire', 'À relancer'],
  },
  {
    value: 'ambassadeur',
    label: m.app_activity_ambassadeur_label,
    hint: m.app_activity_ambassadeur_hint,
    icon: HeartHandshake,
    defaultTags: ['Prospect', 'Leader', 'Filleul', 'Inactif', 'À relancer'],
  },
  {
    value: 'agent_immo',
    label: m.app_activity_agent_immo_label,
    hint: m.app_activity_agent_immo_hint,
    icon: Home,
    defaultTags: ['Acquéreur', 'Vendeur', 'Mandat', 'Visite', 'À relancer'],
  },
  {
    value: 'agent_assurance',
    label: m.app_activity_agent_assurance_label,
    hint: m.app_activity_agent_assurance_hint,
    icon: ShieldCheck,
    defaultTags: ['Prospect', 'Souscripteur', 'Renouvellement', 'À relancer'],
  },
  {
    value: 'recruteur',
    label: m.app_activity_recruteur_label,
    hint: m.app_activity_recruteur_hint,
    icon: Users,
    defaultTags: ['Candidat', 'Poste', 'Vivier', 'Entretien'],
  },
  {
    value: 'etudiant',
    label: m.app_activity_etudiant_label,
    hint: m.app_activity_etudiant_hint,
    icon: GraduationCap,
    defaultTags: ['Candidature', 'Stage', 'Alternance', 'À relancer'],
  },
  {
    value: 'autre',
    label: m.app_activity_autre_label,
    hint: m.app_activity_autre_hint,
    icon: Building2,
    defaultTags: ['Prospect', 'Client', 'À relancer'],
  },
]
