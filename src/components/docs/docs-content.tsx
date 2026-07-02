import {
  BarChart3,
  BellRing,
  Bot,
  Briefcase,
  Building2,
  FileText,
  Gift,
  KanbanSquare,
  Rss,
  Settings,
  Users,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import type { Root } from 'fumadocs-core/page-tree'
import type { Locale } from '~/lib/paraglide/runtime'

type Copy = Record<Locale, string>

export type DocsSection = {
  id: string
  title: Copy
  body: Copy
  bullets: Copy[]
}

export type DocsPage = {
  slug: string
  icon: LucideIcon
  title: Copy
  description: Copy
  appHref?: string
  sections: DocsSection[]
}

export const DOCS_PAGES: DocsPage[] = [
  {
    slug: 'vue-ensemble',
    icon: BarChart3,
    title: { fr: "Vue d'ensemble", en: 'Overview' },
    description: {
      fr: 'Filon centralise le pipeline commercial, les candidatures, les missions, les contacts, les relances et les documents dans un espace unique.',
      en: 'Filon brings sales pipeline work, applications, missions, contacts, follow-ups and documents into one workspace.',
    },
    appHref: '/app',
    sections: [
      {
        id: 'demarrage',
        title: { fr: 'Démarrage', en: 'Getting started' },
        body: {
          fr: "Après l'inscription, Filon ouvre un espace de travail avec tableau de bord, navigation latérale, palette de commandes, capture rapide et préférences de langue et de thème.",
          en: 'After sign-up, Filon opens a workspace with a dashboard, sidebar navigation, command palette, quick capture, and language and theme preferences.',
        },
        bullets: [
          {
            fr: 'Utilisez le tableau de bord pour voir les priorités, les relances du jour, le tunnel et les activités récentes.',
            en: 'Use the dashboard to review priorities, today’s follow-ups, the funnel and recent activity.',
          },
          {
            fr: 'Créez rapidement une opportunité, un contact, une proposition ou une relance depuis les actions de l’app.',
            en: 'Quickly create opportunities, contacts, proposals or follow-ups from app actions.',
          },
          {
            fr: 'Basculez entre français et anglais, puis entre clair et sombre depuis l’en-tête.',
            en: 'Switch between French and English, then between light and dark from the header.',
          },
        ],
      },
      {
        id: 'etats',
        title: { fr: 'États couverts', en: 'Covered states' },
        body: {
          fr: 'Les vues principales gèrent les états de chargement, vide, erreur et succès pour éviter les écrans bloquants.',
          en: 'Core views handle loading, empty, error and success states to avoid dead ends.',
        },
        bullets: [
          {
            fr: 'Le dashboard affiche des squelettes et des messages utiles quand les données ne sont pas encore disponibles.',
            en: 'The dashboard shows skeletons and useful messages while data is unavailable.',
          },
          {
            fr: 'Les listes et tableaux incluent recherche, filtres, actions de ligne et états vides contextualisés.',
            en: 'Lists and tables include search, filters, row actions and contextual empty states.',
          },
        ],
      },
    ],
  },
  {
    slug: 'opportunites',
    icon: Briefcase,
    title: { fr: 'Opportunités et pipeline', en: 'Opportunities and pipeline' },
    description: {
      fr: 'Suivez candidatures, prospects, missions et opportunités avec des vues liste, tableau et calendrier.',
      en: 'Track applications, prospects, missions and opportunities with list, board and calendar views.',
    },
    appHref: '/app/opportunites',
    sections: [
      {
        id: 'vues',
        title: { fr: 'Vues de travail', en: 'Work views' },
        body: {
          fr: 'La page Opportunités conserve la vue et la sélection dans l’URL, ce qui permet de partager ou reprendre exactement le même contexte.',
          en: 'The Opportunities page keeps the current view and selected item in the URL, so the same context can be shared or resumed.',
        },
        bullets: [
          {
            fr: 'Liste pour trier et comparer rapidement les opportunités.',
            en: 'List view for fast sorting and comparison.',
          },
          {
            fr: 'Tableau kanban pour déplacer les opportunités entre les étapes.',
            en: 'Kanban board for moving opportunities across stages.',
          },
          {
            fr: 'Calendrier pour visualiser les échéances et prochaines actions.',
            en: 'Calendar view for deadlines and next actions.',
          },
        ],
      },
      {
        id: 'detail',
        title: { fr: 'Fiche détaillée', en: 'Detail pane' },
        body: {
          fr: 'Chaque opportunité peut porter une entreprise, un contact, un montant, une priorité, des tags, des activités, des documents et des relances.',
          en: 'Each opportunity can carry a company, contact, amount, priority, tags, activity, documents and follow-ups.',
        },
        bullets: [
          {
            fr: 'Les étapes couvrent piste, contacté, postulé, entretien, négociation, gagné et perdu.',
            en: 'Stages cover lead, contacted, applied, interview, negotiation, won and lost.',
          },
          {
            fr: 'Les priorités signalées peuvent être partagées avec l’organisation.',
            en: 'Flagged priorities can be shared with the organization.',
          },
        ],
      },
    ],
  },
  {
    slug: 'veille',
    icon: Rss,
    title: { fr: 'Veille et import', en: 'Watch and import' },
    description: {
      fr: 'Filon surveille et capture les offres utiles, puis les transforme en opportunités exploitables.',
      en: 'Filon monitors and captures useful offers, then turns them into actionable opportunities.',
    },
    appHref: '/app/veille',
    sections: [
      {
        id: 'surveillance',
        title: { fr: 'Surveillance', en: 'Monitoring' },
        body: {
          fr: 'La veille regroupe les recherches sauvegardées, les captures récentes, l’état des sources et un lancement manuel.',
          en: 'The watch area groups saved searches, recent captures, source health and a manual run action.',
        },
        bullets: [
          {
            fr: 'Créez des recherches sauvegardées pour suivre les signaux importants.',
            en: 'Create saved searches to follow important signals.',
          },
          {
            fr: 'Lancez une synchronisation à la demande quand vous voulez rafraîchir les offres.',
            en: 'Run a sync on demand when offers need to be refreshed.',
          },
          {
            fr: 'Importez une offre avec prévisualisation avant création.',
            en: 'Import an offer with preview before creation.',
          },
        ],
      },
    ],
  },
  {
    slug: 'carnet-propositions',
    icon: Building2,
    title: { fr: 'Carnet, propositions et documents', en: 'Contacts, proposals and documents' },
    description: {
      fr: 'Gérez entreprises, particuliers, contacts, propositions commerciales, pièces jointes et exports.',
      en: 'Manage companies, people, contacts, commercial proposals, attachments and exports.',
    },
    appHref: '/app/entreprises',
    sections: [
      {
        id: 'carnet',
        title: { fr: 'Carnet', en: 'Contacts' },
        body: {
          fr: 'Le carnet sépare entreprises, particuliers et filleuls, avec formulaires dédiés, suppression confirmée et import de contacts.',
          en: 'The contact book separates companies, people and referrals with dedicated forms, confirmed deletion and contact import.',
        },
        bullets: [
          {
            fr: 'Associez les contacts aux opportunités pour garder l’historique commercial lisible.',
            en: 'Link contacts to opportunities to keep the commercial history readable.',
          },
          {
            fr: 'Les segments permettent de scanner rapidement le bon groupe.',
            en: 'Segments make the right group easy to scan.',
          },
        ],
      },
      {
        id: 'propositions',
        title: { fr: 'Propositions', en: 'Proposals' },
        body: {
          fr: 'Les propositions disposent de vues liste et tableau, d’un panneau de détail, de lignes chiffrées, de destinataires et de relances.',
          en: 'Proposals include list and board views, a detail pane, priced lines, recipients and follow-ups.',
        },
        bullets: [
          {
            fr: 'Exportez les propositions en PDF, CSV ou tableur selon le besoin.',
            en: 'Export proposals as PDF, CSV or spreadsheets as needed.',
          },
          {
            fr: 'Suivez le statut des destinataires et les prochaines relances.',
            en: 'Track recipient status and next follow-ups.',
          },
        ],
      },
      {
        id: 'documents',
        title: { fr: 'Documents', en: 'Documents' },
        body: {
          fr: 'La bibliothèque centralise CV, lettres, portfolios, pièces commerciales et documents liés aux entités.',
          en: 'The document library centralizes resumes, letters, portfolios, sales files and entity attachments.',
        },
        bullets: [
          {
            fr: 'Téléversez, renommez et rattachez les fichiers au bon contexte.',
            en: 'Upload, rename and attach files to the right context.',
          },
        ],
      },
    ],
  },
  {
    slug: 'relances-mailpulse',
    icon: BellRing,
    title: { fr: 'Relances et MailPulse', en: 'Follow-ups and MailPulse' },
    description: {
      fr: 'Planifiez les rappels locaux, synchronisez le recouvrement MailPulse et gardez les opportunités gagnées sous contrôle.',
      en: 'Schedule local reminders, sync MailPulse recovery and keep won opportunities under control.',
    },
    appHref: '/app/relances',
    sections: [
      {
        id: 'relances',
        title: { fr: 'Relances locales', en: 'Local follow-ups' },
        body: {
          fr: 'La page Relances regroupe les actions en retard, du jour et à venir, avec création et édition manuelles.',
          en: 'The Follow-ups page groups overdue, today and upcoming actions with manual creation and editing.',
        },
        bullets: [
          {
            fr: 'Marquez une relance comme faite sans quitter le flux.',
            en: 'Mark a follow-up as done without leaving the flow.',
          },
          {
            fr: 'Reliez les rappels aux opportunités et propositions concernées.',
            en: 'Link reminders to the relevant opportunities and proposals.',
          },
        ],
      },
      {
        id: 'mailpulse',
        title: { fr: 'MailPulse', en: 'MailPulse' },
        body: {
          fr: 'Quand une opportunité est gagnée, Filon peut proposer un recouvrement MailPulse par email et WhatsApp, ou créer une relance locale si MailPulse n’est pas lié.',
          en: 'When an opportunity is won, Filon can suggest MailPulse recovery by email and WhatsApp, or create a local follow-up if MailPulse is not linked.',
        },
        bullets: [
          {
            fr: 'Les paramètres MailPulse gèrent l’URL, la clé API Filon, le mode de recouvrement, le délai et les canaux.',
            en: 'MailPulse settings manage the URL, Filon API key, recovery mode, delay and channels.',
          },
          {
            fr: 'Les synchronisations affichent les recouvrements en cours et leur statut.',
            en: 'Syncs show ongoing recoveries and their status.',
          },
        ],
      },
    ],
  },
  {
    slug: 'copilot-ia',
    icon: Bot,
    title: { fr: 'Copilot IA', en: 'AI Copilot' },
    description: {
      fr: 'Le copilote aide à lire le pipeline, préparer les actions et générer des réponses avec contrôle utilisateur.',
      en: 'The copilot helps read the pipeline, prepare actions and generate responses while keeping the user in control.',
    },
    appHref: '/app/copilot',
    sections: [
      {
        id: 'assistants',
        title: { fr: 'Assistants spécialisés', en: 'Specialized assistants' },
        body: {
          fr: 'Le copilote s’appuie sur des outils dédiés au carnet, aux relances, au réseau, au pipeline, aux propositions, à l’équipe et à la veille.',
          en: 'The copilot uses dedicated tools for contacts, follow-ups, network, pipeline, proposals, team and watch data.',
        },
        bullets: [
          {
            fr: 'Les widgets affichent opportunités, propositions, équipe, veille et relances dans la conversation.',
            en: 'Widgets render opportunities, proposals, team, watch data and follow-ups inside the conversation.',
          },
          {
            fr: 'Les actions sensibles passent par des cartes d’approbation.',
            en: 'Sensitive actions go through approval cards.',
          },
          {
            fr: 'Les crédits IA et permissions sont visibles dans l’interface.',
            en: 'AI credits and permissions are visible in the interface.',
          },
        ],
      },
    ],
  },
  {
    slug: 'organisation-tarifs-parametres',
    icon: Users,
    title: { fr: 'Organisation, tarifs et paramètres', en: 'Organization, pricing and settings' },
    description: {
      fr: 'Administrez l’équipe, le partage du carnet, le parrainage, l’abonnement, les clés IA et les préférences de l’espace.',
      en: 'Administer the team, contact sharing, referrals, subscription, AI keys and workspace preferences.',
    },
    appHref: '/app/organisation',
    sections: [
      {
        id: 'organisation',
        title: { fr: 'Organisation', en: 'Organization' },
        body: {
          fr: 'Le hub organisation gère la création d’espace, les invitations, les membres, les rôles, les métriques, les priorités signalées et les réglages.',
          en: 'The organization hub manages workspace creation, invites, members, roles, metrics, flagged priorities and settings.',
        },
        bullets: [
          {
            fr: 'Le partage du carnet donne une visibilité contrôlée entre membres.',
            en: 'Contact sharing gives controlled visibility across members.',
          },
          {
            fr: 'Les exports de métriques facilitent le reporting d’équipe.',
            en: 'Metric exports support team reporting.',
          },
        ],
      },
      {
        id: 'tarifs',
        title: { fr: 'Tarifs et facturation', en: 'Pricing and billing' },
        body: {
          fr: 'La page Tarifs présente les plans, déclenche le paiement Paystack et vérifie le retour de paiement.',
          en: 'The Pricing page presents plans, starts Paystack checkout and verifies payment return.',
        },
        bullets: [
          {
            fr: 'La gestion d’abonnement permet renouvellement, annulation, réactivation et changement de plan.',
            en: 'Subscription management supports renewal, cancellation, reactivation and plan changes.',
          },
          {
            fr: 'Le parrainage affiche le code, le lien et les filleuls.',
            en: 'Referral shows the code, link and invited users.',
          },
        ],
      },
      {
        id: 'parametres',
        title: { fr: 'Paramètres', en: 'Settings' },
        body: {
          fr: 'Les paramètres couvrent profil, photo, compte, comptes liés, apparence, préférences, espace, abonnement, clé IA personnelle et MailPulse.',
          en: 'Settings cover profile, photo, account, linked accounts, appearance, preferences, workspace, subscription, personal AI key and MailPulse.',
        },
        bullets: [
          {
            fr: 'Les clés IA personnelles sont stockées côté serveur et peuvent être supprimées.',
            en: 'Personal AI keys are stored server-side and can be removed.',
          },
          {
            fr: 'Les libellés d’étapes peuvent être adaptés au mode de travail.',
            en: 'Stage labels can be adapted to the workflow.',
          },
        ],
      },
    ],
  },
]

const pageBySlug = new Map(DOCS_PAGES.map((page) => [page.slug, page]))

export function getDocsPage(slug: string | undefined): DocsPage | null {
  return pageBySlug.get(slug ?? 'vue-ensemble') ?? null
}

export function docsTree(locale: Locale): Root {
  return {
    name: 'Filon',
    children: [
      {
        type: 'folder',
        name: locale === 'fr' ? 'Documentation' : 'Documentation',
        defaultOpen: true,
        children: DOCS_PAGES.map((page) => ({
          type: 'page',
          name: page.title[locale],
          url: page.slug === 'vue-ensemble' ? '/docs' : `/docs/${page.slug}`,
          icon: <page.icon className="size-4" />,
        })),
      },
    ],
  }
}

export function docsToc(page: DocsPage, locale: Locale) {
  return page.sections.map((section) => ({
    title: section.title[locale],
    url: `#${section.id}`,
    depth: 2,
  }))
}

export const DOCS_ICONS = {
  app: KanbanSquare,
  proposals: FileText,
  referral: Gift,
  settings: Settings,
  billing: WalletCards,
}
