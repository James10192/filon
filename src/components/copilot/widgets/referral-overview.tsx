import { Gift } from 'lucide-react'
import { m } from '~/lib/paraglide/messages'
import { Card, EmptyHint, Header } from './primitives'

/**
 * Widget « parrainage Filon » : lien de parrainage + KPIs (filleuls inscrits /
 * abonnés, mois offerts obtenus et en attente). Rend l'outil `referral_overview`.
 * Lecture seule (la génération du code reste côté UI).
 */

export type ReferralOverviewData = {
  code: string | null
  signedUp: number
  subscribed: number
  freeMonths: number
  pendingMonths: number
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-3">
      <span className="assay text-xl font-semibold text-fg">{value}</span>
      <span className="text-[11px] uppercase tracking-wide text-fg-subtle">
        {label}
      </span>
    </div>
  )
}

export function ReferralOverview({ data }: { data: ReferralOverviewData }) {
  return (
    <Card>
      <Header icon={Gift} label={m.app_tool_referral_label()} />
      {data.code ? (
        <div className="border-b border-border px-3.5 py-2.5">
          <p className="text-[11px] uppercase tracking-wide text-fg-subtle">
            {m.app_tool_referral_code()}
          </p>
          <p className="assay text-sm font-medium text-fg">{data.code}</p>
        </div>
      ) : (
        <EmptyHint text={m.app_tool_referral_no_code()} />
      )}
      <div className="grid grid-cols-3 divide-x divide-border">
        <Kpi label={m.app_tool_referral_signed_up()} value={data.signedUp} />
        <Kpi label={m.app_tool_referral_subscribed()} value={data.subscribed} />
        <Kpi label={m.app_tool_referral_free_months()} value={data.freeMonths} />
      </div>
      {data.pendingMonths > 0 && (
        <p className="border-t border-border px-3.5 py-2 text-xs text-fg-muted">
          {m.app_tool_referral_pending({ n: data.pendingMonths })}
        </p>
      )}
    </Card>
  )
}
