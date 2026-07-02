import type { RichContent } from './docs-rich-showcase'
export function richContentFor(slug: string, locale: 'fr' | 'en'): RichContent {
  const fr = locale === 'fr'
  const fallback = makeRichContent({
    fr,
    title: ['Tableau de bord opérationnel', 'Operational dashboard'],
    subtitle: [
      'Une vue centrale pour prioriser opportunités, relances, documents et actions.',
      'A central view for prioritizing opportunities, follow-ups, documents and actions.',
    ],
    status: ['Temps réel', 'Live'],
    nav: [
      ['Tableau de bord', 'Opportunités', 'Relances', 'Documents'],
      ['Dashboard', 'Opportunities', 'Follow-ups', 'Documents'],
    ],
    metrics: [
      [
        ['Pipeline actif', '34'],
        ['Relances dues', '12'],
        ['Documents liés', '128'],
      ],
      [
        ['Active pipeline', '34'],
        ['Due follow-ups', '12'],
        ['Linked documents', '128'],
      ],
    ],
    rows: [
      [
        ['Mission conseil fintech', 'Priorité', 'Entretien · Aujourd’hui'],
        ['Proposition PME logistique', 'À relancer', 'Montant · 1 250 000 FCFA'],
        ['Dossier candidature senior', 'Documenté', 'CV, lettre, portfolio'],
      ],
      [
        ['Fintech consulting mission', 'Priority', 'Interview · Today'],
        ['Logistics SME proposal', 'Follow-up', 'Amount · 1,250,000 XOF'],
        ['Senior application file', 'Documented', 'Resume, letter, portfolio'],
      ],
    ],
    workflow: [
      ['Capturer une piste', 'Qualifier le contact', 'Piloter le pipeline', 'Relancer ou conclure'],
      ['Capture a lead', 'Qualify the contact', 'Drive the pipeline', 'Follow up or close'],
    ],
    proofs: [
      [
        ['Espace unifié', 'Opportunités, contacts, propositions et fichiers partagent le même contexte.'],
        ['Données exploitables', 'Les listes, tableaux et détails gardent les états de travail visibles.'],
        ['Actions rapides', 'Capture, relance, export et ouverture app restent accessibles depuis le flux.'],
      ],
      [
        ['Unified workspace', 'Opportunities, contacts, proposals and files share the same context.'],
        ['Actionable data', 'Lists, boards and detail panes keep work states visible.'],
        ['Fast actions', 'Capture, follow-up, export and app access stay close to the flow.'],
      ],
    ],
  })

  const content: Record<string, RichContent> = {
    'vue-ensemble': fallback,
    opportunites: makeRichContent({
      fr,
      title: ['Pipeline commercial et candidatures', 'Sales and application pipeline'],
      subtitle: [
        'Liste, kanban, calendrier et fiche détail pour garder chaque opportunité lisible.',
        'List, board, calendar and detail pane keep every opportunity readable.',
      ],
      status: ['Vue pipeline', 'Pipeline view'],
      nav: [
        ['Opportunités', 'Pipeline', 'Calendrier', 'Détail'],
        ['Opportunities', 'Pipeline', 'Calendar', 'Detail'],
      ],
      metrics: [
        [
          ['En négociation', '8'],
          ['Gagnées', '5'],
          ['Valeur suivie', '9,4M'],
        ],
        [
          ['Negotiating', '8'],
          ['Won', '5'],
          ['Tracked value', '9.4M'],
        ],
      ],
      rows: [
        [
          ['Lead · Cabinet RH', 'Contacté', 'Priorité haute · Abidjan'],
          ['Candidature · Product manager', 'Entretien', 'Prochaine action · 14:00'],
          ['Mission · Audit commercial', 'Négociation', 'Décideur identifié'],
        ],
        [
          ['Lead · HR firm', 'Contacted', 'High priority · Abidjan'],
          ['Application · Product manager', 'Interview', 'Next action · 14:00'],
          ['Mission · Sales audit', 'Negotiation', 'Decision maker identified'],
        ],
      ],
      workflow: [
        ['Créer l’opportunité', 'Assigner étape et priorité', 'Joindre activités et documents', 'Gagner, perdre ou relancer'],
        ['Create opportunity', 'Assign stage and priority', 'Attach activity and documents', 'Win, lose or follow up'],
      ],
      proofs: [
        [
          ['Traçabilité', 'Chaque opportunité garde contact, entreprise, montant, tags et historique.'],
          ['Pilotage visuel', 'Les vues liste, kanban et calendrier servent des rythmes de travail différents.'],
          ['Contexte complet', 'La fiche détail réunit documents, activités, relances et décisions.'],
        ],
        [
          ['Traceability', 'Each opportunity keeps contact, company, amount, tags and history.'],
          ['Visual control', 'List, board and calendar support different working rhythms.'],
          ['Complete context', 'The detail pane groups documents, activity, follow-ups and decisions.'],
        ],
      ],
    }),
    veille: makeRichContent({
      fr,
      title: ['Veille, sources et captures', 'Monitoring, sources and captures'],
      subtitle: [
        'Les recherches sauvegardées transforment les signaux entrants en opportunités qualifiées.',
        'Saved searches turn incoming signals into qualified opportunities.',
      ],
      status: ['Sources actives', 'Active sources'],
      nav: [
        ['Veille', 'Sources', 'Captures', 'Import'],
        ['Watch', 'Sources', 'Captures', 'Import'],
      ],
      metrics: [
        [
          ['Sources', '6'],
          ['Captures', '42'],
          ['À importer', '9'],
        ],
        [
          ['Sources', '6'],
          ['Captures', '42'],
          ['To import', '9'],
        ],
      ],
      rows: [
        [
          ['Appel à proposition · SaaS', 'Nouveau', 'Score fort · Aujourd’hui'],
          ['Mission freelance · CRM', 'À vérifier', 'Source LinkedIn'],
          ['Offre · Business developer', 'Importable', 'Contact trouvé'],
        ],
        [
          ['Proposal call · SaaS', 'New', 'Strong score · Today'],
          ['Freelance mission · CRM', 'Review', 'LinkedIn source'],
          ['Offer · Business developer', 'Importable', 'Contact found'],
        ],
      ],
      workflow: [
        ['Définir la recherche', 'Surveiller les sources', 'Prévisualiser l’offre', 'Créer l’opportunité'],
        ['Define the search', 'Monitor sources', 'Preview the offer', 'Create the opportunity'],
      ],
      proofs: [
        [
          ['Sources lisibles', 'Chaque source affiche son état pour éviter les imports à l’aveugle.'],
          ['Prévisualisation', 'L’offre est vérifiée avant création dans le pipeline.'],
          ['Continuité', 'Une capture devient opportunité, puis relance ou proposition.'],
        ],
        [
          ['Readable sources', 'Each source shows its health to avoid blind imports.'],
          ['Preview first', 'The offer is reviewed before pipeline creation.'],
          ['Continuity', 'A capture becomes an opportunity, then a follow-up or proposal.'],
        ],
      ],
    }),
    'carnet-propositions': makeRichContent({
      fr,
      title: ['Carnet, propositions et documents reliés', 'Linked contacts, proposals and documents'],
      subtitle: [
        'Le contexte commercial reste attaché aux entreprises, contacts, propositions et fichiers.',
        'Commercial context stays attached to companies, contacts, proposals and files.',
      ],
      status: ['Documents liés', 'Linked files'],
      nav: [
        ['Carnet', 'Propositions', 'Documents', 'Exports'],
        ['Contacts', 'Proposals', 'Documents', 'Exports'],
      ],
      metrics: [
        [
          ['Contacts', '216'],
          ['Propositions', '18'],
          ['Exports', '7'],
        ],
        [
          ['Contacts', '216'],
          ['Proposals', '18'],
          ['Exports', '7'],
        ],
      ],
      rows: [
        [
          ['Groupe Éburnie Conseil', 'Entreprise', '3 contacts · 2 opportunités'],
          ['Proposition recouvrement', 'Envoyée', 'PDF · 850 000 FCFA'],
          ['Portfolio commercial', 'Attaché', 'Proposition · Opportunité'],
        ],
        [
          ['Eburnie Consulting Group', 'Company', '3 contacts · 2 opportunities'],
          ['Recovery proposal', 'Sent', 'PDF · 850,000 XOF'],
          ['Sales portfolio', 'Attached', 'Proposal · Opportunity'],
        ],
      ],
      workflow: [
        ['Créer le contact', 'Associer au dossier', 'Préparer la proposition', 'Exporter et suivre'],
        ['Create contact', 'Attach to context', 'Prepare proposal', 'Export and track'],
      ],
      proofs: [
        [
          ['Carnet segmenté', 'Entreprises, particuliers et filleuls restent séparés mais reliables.'],
          ['Propositions suivies', 'Statuts, montants, destinataires et lignes chiffrées restent accessibles.'],
          ['Bibliothèque utile', 'Les fichiers sont attachés au contexte plutôt que perdus dans un dossier.'],
        ],
        [
          ['Segmented contacts', 'Companies, people and referrals stay separate but linkable.'],
          ['Tracked proposals', 'Statuses, amounts, recipients and line items remain accessible.'],
          ['Useful library', 'Files attach to context instead of disappearing in a folder.'],
        ],
      ],
    }),
    'relances-mailpulse': makeRichContent({
      fr,
      title: ['Relances locales et recouvrement MailPulse', 'Local follow-ups and MailPulse recovery'],
      subtitle: [
        'Les rappels Filon et les recouvrements MailPulse donnent une lecture claire des actions dues.',
        'Filon reminders and MailPulse recoveries make due actions clear.',
      ],
      status: ['MailPulse relié', 'MailPulse linked'],
      nav: [
        ['Relances', 'MailPulse', 'Retards', 'À venir'],
        ['Follow-ups', 'MailPulse', 'Overdue', 'Upcoming'],
      ],
      metrics: [
        [
          ['Aujourd’hui', '6'],
          ['En retard', '3'],
          ['MailPulse', '11'],
        ],
        [
          ['Today', '6'],
          ['Overdue', '3'],
          ['MailPulse', '11'],
        ],
      ],
      rows: [
        [
          ['Relancer Marcel D.', 'Email', 'Opportunité gagnée · 09:30'],
          ['Recouvrement facture 042', 'WhatsApp', 'MailPulse · Semi-automatique'],
          ['Suivi proposition PME', 'Local', 'Après 3 jours'],
        ],
        [
          ['Follow up Marcel D.', 'Email', 'Won opportunity · 09:30'],
          ['Invoice 042 recovery', 'WhatsApp', 'MailPulse · Semi-automatic'],
          ['SME proposal follow-up', 'Local', 'After 3 days'],
        ],
      ],
      workflow: [
        ['Gagner l’opportunité', 'Proposer MailPulse', 'Planifier le rappel', 'Suivre le statut'],
        ['Win opportunity', 'Suggest MailPulse', 'Schedule reminder', 'Track status'],
      ],
      proofs: [
        [
          ['Pas d’oubli', 'Les relances du jour, en retard et à venir sont séparées clairement.'],
          ['Connexion MailPulse', 'URL, clé API, canaux, délai et mode sont visibles dans les paramètres.'],
          ['Fallback local', 'Filon crée une relance locale si MailPulse n’est pas encore relié.'],
        ],
        [
          ['No missed action', 'Today, overdue and upcoming follow-ups are clearly separated.'],
          ['MailPulse connection', 'URL, API key, channels, delay and mode are visible in settings.'],
          ['Local fallback', 'Filon creates a local follow-up when MailPulse is not linked yet.'],
        ],
      ],
    }),
    'copilot-ia': makeRichContent({
      fr,
      title: ['Copilot IA contextualisé', 'Context-aware AI copilot'],
      subtitle: [
        'Le copilote lit le pipeline, restitue les widgets utiles et garde les actions sensibles sous contrôle.',
        'The copilot reads the pipeline, returns useful widgets and keeps sensitive actions controlled.',
      ],
      status: ['Avec approbation', 'Approval gated'],
      nav: [
        ['Copilot', 'Pipeline', 'Relances', 'Actions'],
        ['Copilot', 'Pipeline', 'Follow-ups', 'Actions'],
      ],
      metrics: [
        [
          ['Assistants', '7'],
          ['Widgets', '9'],
          ['Actions', 'Ctrl'],
        ],
        [
          ['Assistants', '7'],
          ['Widgets', '9'],
          ['Actions', 'Ctrl'],
        ],
      ],
      rows: [
        [
          ['Analyse du pipeline', 'Widget', 'Priorités et risques'],
          ['Brouillon de réponse', 'IA', 'Validation utilisateur requise'],
          ['Plan de relance', 'Action', 'Cartes d’approbation'],
        ],
        [
          ['Pipeline analysis', 'Widget', 'Priorities and risks'],
          ['Reply draft', 'AI', 'User approval required'],
          ['Follow-up plan', 'Action', 'Approval cards'],
        ],
      ],
      workflow: [
        ['Poser la question', 'Lire le contexte', 'Afficher les widgets', 'Valider l’action'],
        ['Ask the question', 'Read context', 'Render widgets', 'Approve action'],
      ],
      proofs: [
        [
          ['Contexte métier', 'Les réponses s’appuient sur pipeline, carnet, relances et propositions.'],
          ['Rendu structuré', 'Les widgets évitent les réponses texte impossibles à exploiter.'],
          ['Contrôle utilisateur', 'Les actions sensibles demandent une validation visible.'],
        ],
        [
          ['Business context', 'Answers use pipeline, contacts, follow-ups and proposals.'],
          ['Structured output', 'Widgets avoid unhelpful plain-text answers.'],
          ['User control', 'Sensitive actions require visible approval.'],
        ],
      ],
    }),
    'organisation-tarifs-parametres': makeRichContent({
      fr,
      title: ['Administration, abonnement et réglages', 'Administration, billing and settings'],
      subtitle: [
        'L’espace regroupe équipe, partage, parrainage, abonnement, IA personnelle et MailPulse.',
        'The workspace groups team, sharing, referral, subscription, personal AI and MailPulse.',
      ],
      status: ['Espace configuré', 'Workspace ready'],
      nav: [
        ['Organisation', 'Tarifs', 'Paramètres', 'MailPulse'],
        ['Organization', 'Pricing', 'Settings', 'MailPulse'],
      ],
      metrics: [
        [
          ['Membres', '5'],
          ['Plan', 'Pro'],
          ['Préférences', '12'],
        ],
        [
          ['Members', '5'],
          ['Plan', 'Pro'],
          ['Preferences', '12'],
        ],
      ],
      rows: [
        [
          ['Invitation équipe commerciale', 'Envoyée', 'Rôle · Membre'],
          ['Clé IA personnelle', 'Active', 'Stockage serveur'],
          ['Connexion MailPulse', 'À finaliser', 'URL et clé API'],
        ],
        [
          ['Sales team invitation', 'Sent', 'Role · Member'],
          ['Personal AI key', 'Active', 'Server-side storage'],
          ['MailPulse connection', 'Finish', 'URL and API key'],
        ],
      ],
      workflow: [
        ['Créer l’espace', 'Inviter l’équipe', 'Configurer les accès', 'Suivre l’abonnement'],
        ['Create workspace', 'Invite team', 'Configure access', 'Track subscription'],
      ],
      proofs: [
        [
          ['Administration claire', 'Membres, rôles, priorités et réglages sont réunis dans le hub.'],
          ['Facturation intégrée', 'Plans, paiement et retour de paiement sont connectés au compte.'],
          ['Réglages métier', 'Étapes, apparence, IA personnelle et MailPulse restent configurables.'],
        ],
        [
          ['Clear administration', 'Members, roles, priorities and settings live in one hub.'],
          ['Integrated billing', 'Plans, checkout and payment return are connected to the account.'],
          ['Business settings', 'Stages, appearance, personal AI and MailPulse stay configurable.'],
        ],
      ],
    }),
  }

  const selectedSlug = content[slug] ? slug : 'vue-ensemble'
  return withAssets(selectedSlug, content[slug] ?? fallback, fr)
}

type RichSource = {
  fr: boolean
  title: [string, string]
  subtitle: [string, string]
  status: [string, string]
  nav: [string[], string[]]
  metrics: [[string, string][], [string, string][]]
  rows: [[string, string, string][], [string, string, string][]]
  workflow: [string[], string[]]
  proofs: [[string, string][], [string, string][]]
}

function makeRichContent(source: RichSource): RichContent {
  const index = source.fr ? 0 : 1
  const workflow = source.workflow[index]

  return {
    screenshotTitle: source.title[index],
    screenshotSubtitle: source.subtitle[index],
    screenshotStatus: source.status[index],
    screenshotSrc: '/docs/screenshots/dashboard.png',
    screenshotAlt: source.fr
      ? `Capture réelle Filon · ${source.title[0]}`
      : `Real Filon screenshot · ${source.title[1]}`,
    sidebarItems: source.nav[index],
    metricCards: source.metrics[index].map(([label, value]) => ({ label, value })),
    tableRows: source.rows[index].map(([label, status, meta]) => ({
      label,
      status,
      meta,
    })),
    workflow,
    diagramDefinition: workflowToMermaid(workflow),
    proofs: source.proofs[index].map(([title, body]) => ({ title, body })),
  }
}

function withAssets(
  slug: string,
  content: RichContent,
  fr: boolean,
): RichContent {
  const screenshotSrc =
    screenshotBySlug[slug] ?? screenshotBySlug['vue-ensemble']

  return {
    ...content,
    screenshotSrc,
    screenshotAlt: fr
      ? `Capture réelle de Filon pour ${content.screenshotTitle}`
      : `Real Filon screenshot for ${content.screenshotTitle}`,
  }
}

const screenshotBySlug: Record<string, string> = {
  'vue-ensemble': '/docs/screenshots/dashboard.png',
  opportunites: '/docs/screenshots/opportunites.png',
  veille: '/docs/screenshots/veille.png',
  'carnet-propositions': '/docs/screenshots/propositions.png',
  'relances-mailpulse': '/docs/screenshots/relances.png',
  'copilot-ia': '/docs/screenshots/copilot.png',
  'organisation-tarifs-parametres': '/docs/screenshots/parametres.png',
}

function workflowToMermaid(steps: string[]) {
  const nodes = steps.map((step, index) => {
    const nodeId = `S${index + 1}`
    return `  ${nodeId}["${escapeMermaidLabel(step)}"]`
  })
  const links = steps.slice(0, -1).map((_, index) => {
    return `  S${index + 1} --> S${index + 2}`
  })

  return ['flowchart LR', ...nodes, ...links].join('\n')
}

function escapeMermaidLabel(value: string) {
  return value.replace(/"/g, '\\"')
}
