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

/**
 * Catalogue des profils d'activite proposes a l'onboarding. Modele FLEXIBLE et
 * generique : chaque profil pre-remplit un jeu d'etiquettes par defaut adaptees.
 * La valeur stockee (`value`) est libre cote backend (`users.activityType`).
 */
export type ActivityProfile = {
  value: string
  label: string
  hint: string
  icon: LucideIcon
  /** Etiquettes pre-creees a la fin de l'onboarding pour ce profil. */
  defaultTags: string[]
}

export const ACTIVITY_PROFILES: ActivityProfile[] = [
  {
    value: 'freelance_dev',
    label: 'Développeur freelance',
    hint: 'Missions, clients, prospection technique',
    icon: Briefcase,
    defaultTags: ['Client', 'Mission', 'Prospect', 'Recommandation'],
  },
  {
    value: 'consultant',
    label: 'Consultant',
    hint: 'Conseil, accompagnement, expertise',
    icon: Sparkles,
    defaultTags: ['Client', 'Prospect', 'Partenaire', 'À relancer'],
  },
  {
    value: 'ambassadeur',
    label: 'Ambassadeur / parrainage',
    hint: 'Recrutement de filleuls, réseau, parrainage',
    icon: HeartHandshake,
    defaultTags: ['Prospect', 'Leader', 'Filleul', 'Inactif', 'À relancer'],
  },
  {
    value: 'agent_immo',
    label: 'Agent immobilier',
    hint: 'Biens, acquéreurs, vendeurs, mandats',
    icon: Home,
    defaultTags: ['Acquéreur', 'Vendeur', 'Mandat', 'Visite', 'À relancer'],
  },
  {
    value: 'agent_assurance',
    label: 'Agent d’assurance',
    hint: 'Souscripteurs, contrats, renouvellements',
    icon: ShieldCheck,
    defaultTags: ['Prospect', 'Souscripteur', 'Renouvellement', 'À relancer'],
  },
  {
    value: 'recruteur',
    label: 'Recruteur',
    hint: 'Candidats, postes, viviers',
    icon: Users,
    defaultTags: ['Candidat', 'Poste', 'Vivier', 'Entretien'],
  },
  {
    value: 'etudiant',
    label: 'Étudiant / jeune diplômé',
    hint: 'Candidatures, stages, premières opportunités',
    icon: GraduationCap,
    defaultTags: ['Candidature', 'Stage', 'Alternance', 'À relancer'],
  },
  {
    value: 'autre',
    label: 'Autre',
    hint: 'Un autre métier de prospection',
    icon: Building2,
    defaultTags: ['Prospect', 'Client', 'À relancer'],
  },
]
