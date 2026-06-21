import { m } from '~/lib/paraglide/messages'
import { roleLabel, type OrgRole } from '~/components/org/roles'

/**
 * Modèle partagé du rapport « métriques membres », consommé à la fois par
 * l'export Excel (`to-xlsx`) et PDF (`to-pdf`) et par le tableau à l'écran.
 * Source de vérité unique des colonnes pour garantir des sorties identiques.
 */

export type ReportMetrics = {
  total: number
  active: number
  won: number
  lost: number
  flagged: number
  overdueFollowups: number
  conversion: number
}

export type ReportMember = {
  name: string | null
  email: string
  role: OrgRole
  metrics: ReportMetrics
}

export type MemberReport = {
  generatedAt: number
  members: ReportMember[]
  totals: ReportMetrics
}

/** Pourcentage entier lisible (« 42 % »). */
export function pct(x: number): string {
  return `${Math.round(x * 100)} %`
}

/** En-têtes de colonnes (i18n), dans l'ordre. */
export function reportColumns(): string[] {
  return [
    m.metrics_col_member(),
    m.metrics_col_role(),
    m.metrics_col_total(),
    m.metrics_col_active(),
    m.metrics_col_won(),
    m.metrics_col_lost(),
    m.metrics_col_conversion(),
    m.metrics_col_overdue(),
    m.metrics_col_flagged(),
  ]
}

/** Ligne d'un membre, alignée sur `reportColumns()`. */
export function memberRow(member: ReportMember): (string | number)[] {
  const mt = member.metrics
  return [
    member.name ?? member.email,
    roleLabel(member.role),
    mt.total,
    mt.active,
    mt.won,
    mt.lost,
    pct(mt.conversion),
    mt.overdueFollowups,
    mt.flagged,
  ]
}

/** Ligne de totaux de l'organisation. */
export function totalsRow(totals: ReportMetrics): (string | number)[] {
  return [
    m.metrics_totals(),
    '',
    totals.total,
    totals.active,
    totals.won,
    totals.lost,
    pct(totals.conversion),
    totals.overdueFollowups,
    totals.flagged,
  ]
}
