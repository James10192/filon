/**
 * Surface publique du module d'export CSV.
 *
 * - `to-csv` : generateur + telechargement Blob (pur, sans dependance).
 * - `columns` : definitions de colonnes par entite (libelles FR du domaine).
 */

export {
  buildCsv,
  downloadCsv,
  csvFilename,
  exportCsv,
  type CsvColumn,
} from './to-csv'

export {
  OPPORTUNITY_COLUMNS,
  PROPOSAL_COLUMNS,
  CONTACT_COLUMNS,
  FOLLOWUP_COLUMNS,
  type ExportOpportunity,
  type ExportProposal,
  type ExportContact,
  type ExportFollowup,
} from './columns'
