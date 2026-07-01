/**
 * Definitions de colonnes CSV par entite metier (opportunites, propositions,
 * contacts, relances).
 *
 * Chaque jeu de colonnes mappe la forme ENRICHIE deja chargee cote client (celle
 * renvoyee par les queries Convex listees dans le contrat d'API) vers des
 * cellules lisibles, en reutilisant les libelles FR du domaine (STAGE_META,
 * TYPE_META, STATUS_LABELS...). Aucune donnee supplementaire n'est requetee :
 * on n'exporte que ce que la page tient deja en memoire.
 *
 * Les types d'entree sont volontairement permissifs (`Partial`/optionnels) : les
 * queries enrichies ajoutent des champs (companyName, contactName...) absents du
 * Doc brut. On ne plante jamais sur un champ manquant (cellule vide).
 */

import type { CsvColumn } from './to-csv'
import {
  STAGE_META,
  TYPE_META,
  PRIORITY_META,
  SOURCE_META,
  type Stage,
  type OppType,
  type Priority,
  type SourceChannel,
} from '~/components/opportunities/meta'
import {
  STATUS_LABELS,
  type ProposalStatus,
} from '~/components/proposals/proposal-status'
import {
  normalizeProposalKind,
  proposalKindLabel,
  type ProposalKind,
} from '~/components/proposals/proposal-kind'

/** Date (ISO string ou timestamp ms) -> « JJ/MM/AAAA », vide si absente. */
function formatDateCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  const date = typeof value === 'number' ? new Date(value) : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

/** Oui / Non pour un booleen (vide si indefini). */
function yesNo(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return ''
  return value ? 'Oui' : 'Non'
}

// --- Opportunites -----------------------------------------------------------

/** Forme minimale d'une opportunite enrichie (api.opportunities.list). */
export type ExportOpportunity = {
  title?: string
  stage?: string
  type?: string
  priority?: string
  companyName?: string | null
  contactName?: string | null
  amount?: number | null
  currency?: string | null
  sourceChannel?: string | null
  source?: string | null
  location?: string | null
  nextActionDate?: string | null
  createdAt?: string | number | null
  notes?: string | null
}

export const OPPORTUNITY_COLUMNS: CsvColumn<ExportOpportunity>[] = [
  { header: 'Titre', value: (o) => o.title ?? '' },
  {
    header: 'Étape',
    value: (o) =>
      o.stage && o.stage in STAGE_META
        ? STAGE_META[o.stage as Stage].label
        : (o.stage ?? ''),
  },
  {
    header: 'Type',
    value: (o) =>
      o.type && o.type in TYPE_META
        ? TYPE_META[o.type as OppType].label
        : (o.type ?? ''),
  },
  {
    header: 'Priorité',
    value: (o) =>
      o.priority && o.priority in PRIORITY_META
        ? PRIORITY_META[o.priority as Priority].label
        : (o.priority ?? ''),
  },
  { header: 'Entreprise', value: (o) => o.companyName ?? '' },
  { header: 'Contact', value: (o) => o.contactName ?? '' },
  { header: 'Montant', value: (o) => o.amount ?? '' },
  { header: 'Devise', value: (o) => o.currency ?? '' },
  {
    header: 'Canal d’origine',
    value: (o) =>
      o.sourceChannel && o.sourceChannel in SOURCE_META
        ? SOURCE_META[o.sourceChannel as SourceChannel].label
        : (o.sourceChannel ?? ''),
  },
  { header: 'Source', value: (o) => o.source ?? '' },
  { header: 'Lieu', value: (o) => o.location ?? '' },
  { header: 'Prochaine action', value: (o) => formatDateCell(o.nextActionDate) },
  { header: 'Créée le', value: (o) => formatDateCell(o.createdAt) },
  { header: 'Notes', value: (o) => o.notes ?? '' },
]

// --- Propositions ------------------------------------------------------------

/** Forme minimale d'une proposition (api.proposals.*). */
export type ExportProposal = {
  kind?: string
  title?: string
  status?: string
  companyName?: string | null
  contactName?: string | null
  amount?: number | null
  currency?: string | null
  sentAt?: string | null
  validUntil?: string | null
  lineItems?: Array<{ label: string; quantity: number; unitPrice: number }> | null
  createdAt?: string | number | null
  pitch?: string | null
  terms?: string | null
  notes?: string | null
}

export const PROPOSAL_COLUMNS: CsvColumn<ExportProposal>[] = [
  {
    header: 'Type',
    value: (p) => proposalKindLabel(normalizeProposalKind(p.kind) as ProposalKind),
  },
  { header: 'Titre', value: (p) => p.title ?? '' },
  {
    header: 'Statut',
    value: (p) =>
      p.status && p.status in STATUS_LABELS
        ? STATUS_LABELS[p.status as ProposalStatus]
        : (p.status ?? ''),
  },
  { header: 'Entreprise', value: (p) => p.companyName ?? '' },
  { header: 'Contact', value: (p) => p.contactName ?? '' },
  { header: 'Montant', value: (p) => p.amount ?? '' },
  { header: 'Devise', value: (p) => p.currency ?? '' },
  { header: 'Envoyée le', value: (p) => formatDateCell(p.sentAt) },
  { header: 'Valable jusqu’au', value: (p) => formatDateCell(p.validUntil) },
  {
    header: 'Lignes',
    value: (p) =>
      p.lineItems?.map((line) => `${line.label} x${line.quantity}`).join(' | ') ??
      '',
  },
  { header: 'Créée le', value: (p) => formatDateCell(p.createdAt) },
  { header: 'Pitch', value: (p) => p.pitch ?? '' },
  { header: 'Conditions', value: (p) => p.terms ?? '' },
  { header: 'Notes', value: (p) => p.notes ?? '' },
]

// --- Contacts ----------------------------------------------------------------

/** Forme minimale d'un contact enrichi (api.contacts.list). */
export type ExportContact = {
  name?: string
  role?: string | null
  companyName?: string | null
  email?: string | null
  phone?: string | null
  linkedin?: string | null
  location?: string | null
  relationship?: string | null
  referredBy?: string | null
  notes?: string | null
}

export const CONTACT_COLUMNS: CsvColumn<ExportContact>[] = [
  { header: 'Nom', value: (c) => c.name ?? '' },
  { header: 'Fonction', value: (c) => c.role ?? '' },
  { header: 'Entreprise', value: (c) => c.companyName ?? '' },
  { header: 'E-mail', value: (c) => c.email ?? '' },
  { header: 'Téléphone', value: (c) => c.phone ?? '' },
  { header: 'LinkedIn', value: (c) => c.linkedin ?? '' },
  { header: 'Lieu', value: (c) => c.location ?? '' },
  { header: 'Relation', value: (c) => c.relationship ?? '' },
  { header: 'Recommandé par', value: (c) => c.referredBy ?? '' },
  { header: 'Notes', value: (c) => c.notes ?? '' },
]

// --- Relances ----------------------------------------------------------------

/** Forme minimale d'une relance (api.followups.due, aplatie). */
export type ExportFollowup = {
  opportunityTitle?: string | null
  note?: string | null
  dueDate?: string | null
  done?: boolean | null
  createdAt?: string | number | null
}

export const FOLLOWUP_COLUMNS: CsvColumn<ExportFollowup>[] = [
  { header: 'Opportunité', value: (f) => f.opportunityTitle ?? '' },
  { header: 'Note', value: (f) => f.note ?? '' },
  { header: 'Échéance', value: (f) => formatDateCell(f.dueDate) },
  { header: 'Faite', value: (f) => yesNo(f.done) },
  { header: 'Créée le', value: (f) => formatDateCell(f.createdAt) },
]
