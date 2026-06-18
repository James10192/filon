import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import {
  Bot,
  Briefcase,
  Building2,
  CalendarClock,
  CreditCard,
  FileText,
  MessageSquare,
  Radar,
  Shield,
  ShieldOff,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Plan } from '~/lib/billing/plan'
import { forbiddenMessage } from '~/lib/billing/plan'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog'
import { toast } from '~/components/ui/sonner'
import {
  feedbackStatusLabel,
  feedbackTypeLabel,
  proposalStatusLabel,
  stageLabel,
  feedbackStatusVariant,
  feedbackTypeVariant,
  formatDate,
  formatNumber,
  formatRelative,
  formatXof,
  initials,
  planBadgeVariant,
  planLabel,
} from './admin-meta'
import { m } from '~/lib/paraglide/messages'

const PLAN_OPTIONS: Plan[] = ['free', 'pro', 'pro_ai', 'copilot']
const STAGE_ORDER = [
  'lead',
  'contacted',
  'applied',
  'interview',
  'negotiation',
  'won',
  'lost',
] as const

/** Message d'erreur lisible (FORBIDDEN ou générique) pour un toast. */
function errorMessage(error: unknown): string {
  return forbiddenMessage(error) ?? m.admin_action_failed()
}

/**
 * Vue 360 d'un compte (panneau détail master-detail du back-office). Charge
 * `api.admin.userDetail` et présente profil, abonnement + MRR, activité produit,
 * IA, veille et feedbacks récents, avec les actions admin (palier, rôle,
 * suspension) sous confirmation.
 */
export function AdminAccountDetail({
  userId,
  onClose,
}: {
  userId: string
  onClose: () => void
}) {
  const detail = useQuery(api.admin.userDetail, { userId })

  if (detail === undefined) return <DetailSkeleton onClose={onClose} />

  const { profile, abonnement, activite, ia, veille, feedbacks } = detail
  const name = profile.name?.trim() || profile.email

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-11">
            {profile.image && <AvatarImage src={profile.image} alt={name} />}
            <AvatarFallback>{initials(name)}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold text-fg">{name}</span>
              {profile.role === 'admin' && (
                <Badge variant="info">{m.admin_badge_admin()}</Badge>
              )}
              {profile.suspended && (
                <Badge variant="danger">{m.admin_badge_suspended()}</Badge>
              )}
            </div>
            <span className="truncate text-sm text-fg-muted">
              {profile.email}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label={m.admin_close_detail()}
          className="h-11 w-11 shrink-0"
        >
          <X className="size-4" />
        </Button>
      </header>

      <div className="flex flex-col gap-4 overflow-y-auto px-5 py-5">
        <ProfileMeta createdAt={profile.createdAt} lastActivityAt={detail.lastActivityAt} />

        <SubscriptionCard plan={profile.plan} abonnement={abonnement} />

        <ActivityCard activite={activite} />

        <AiCard ia={ia} />

        <VeilleCard captures={veille.captures} />

        <FeedbacksCard feedbacks={feedbacks} />

        <AdminActions
          userId={userId}
          plan={profile.plan}
          isAdminRole={profile.role === 'admin'}
          suspended={profile.suspended}
        />
      </div>
    </div>
  )
}

function ProfileMeta({
  createdAt,
  lastActivityAt,
}: {
  createdAt: number
  lastActivityAt: number
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-fg-muted">
      <span className="inline-flex items-center gap-1.5">
        <CalendarClock className="size-4 text-fg-subtle" />
        {m.admin_account_registered_on({ date: formatDate(createdAt) })}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Sparkles className="size-4 text-fg-subtle" />
        {m.admin_account_activity({ date: formatRelative(lastActivityAt) })}
      </span>
    </div>
  )
}

function SubscriptionCard({
  plan,
  abonnement,
}: {
  plan: Plan
  abonnement: {
    planInterval?: 'monthly' | 'annual'
    planRenewsAt?: number
    autoRenew: boolean
    cardLast4?: string
    cardBrand?: string
    mrrXof: number
  }
}) {
  const intervalLabel =
    abonnement.planInterval === 'annual'
      ? m.admin_billing_annual()
      : abonnement.planInterval === 'monthly'
        ? m.admin_billing_monthly()
        : null
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-sm">{m.admin_subscription_title()}</CardTitle>
        <Badge variant={planBadgeVariant(plan)}>{planLabel(plan)}</Badge>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <Metric label={m.admin_metric_mrr()} value={formatXof(abonnement.mrrXof)} />
        <Metric label={m.admin_metric_billing()} value={intervalLabel ?? '—'} />
        <Metric
          label={m.admin_metric_renewal()}
          value={
            abonnement.planRenewsAt
              ? formatDate(abonnement.planRenewsAt)
              : '—'
          }
        />
        <Metric
          label={m.admin_metric_auto_renew()}
          value={abonnement.autoRenew ? m.admin_enabled() : m.admin_disabled()}
        />
        <div className="col-span-2 flex items-center gap-2 text-sm text-fg-muted">
          <CreditCard className="size-4 text-fg-subtle" />
          {abonnement.cardLast4
            ? `${abonnement.cardBrand ? `${abonnement.cardBrand} ` : ''}···· ${abonnement.cardLast4}`
            : m.admin_no_card()}
        </div>
      </CardContent>
    </Card>
  )
}

function ActivityCard({
  activite,
}: {
  activite: {
    opportunitiesByStage: Record<string, number>
    opportunitiesTotal: number
    veilles: { total: number; enabled: number }
    proposals: { total: number; byStatus: Record<string, number> }
    companies: number
    contacts: number
    followups: { total: number; open: number }
    documents: number
  }
}) {
  const max = Math.max(
    1,
    ...STAGE_ORDER.map((s) => activite.opportunitiesByStage[s] ?? 0),
  )
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{m.admin_activity_title()}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="inline-flex items-center gap-1.5 text-fg-muted">
              <Briefcase className="size-4 text-fg-subtle" />
              {m.admin_activity_opportunities()}
            </span>
            <span className="assay font-medium text-fg">
              {formatNumber(activite.opportunitiesTotal)}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {STAGE_ORDER.map((stage) => {
              const count = activite.opportunitiesByStage[stage] ?? 0
              return (
                <div key={stage} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 text-xs text-fg-subtle">
                    {stageLabel(stage)}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${(count / max) * 100}%` }}
                    />
                  </div>
                  <span className="assay w-7 shrink-0 text-right text-xs text-fg-muted">
                    {count}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-3">
          <StatChip
            icon={<Radar className="size-4" />}
            label={m.admin_stat_veilles()}
            value={`${activite.veilles.enabled}/${activite.veilles.total}`}
          />
          <StatChip
            icon={<MessageSquare className="size-4" />}
            label={m.admin_stat_proposals()}
            value={formatNumber(activite.proposals.total)}
          />
          <StatChip
            icon={<Building2 className="size-4" />}
            label={m.admin_stat_companies()}
            value={formatNumber(activite.companies)}
          />
          <StatChip
            icon={<Users className="size-4" />}
            label={m.admin_stat_contacts()}
            value={formatNumber(activite.contacts)}
          />
          <StatChip
            icon={<CalendarClock className="size-4" />}
            label={m.admin_stat_followups()}
            value={`${activite.followups.open}/${activite.followups.total}`}
          />
          <StatChip
            icon={<FileText className="size-4" />}
            label={m.admin_stat_documents()}
            value={formatNumber(activite.documents)}
          />
        </div>

        {activite.proposals.total > 0 && (
          <div className="flex flex-wrap gap-1.5 border-t border-border pt-4">
            {Object.entries(activite.proposals.byStatus)
              .filter(([, n]) => n > 0)
              .map(([status, n]) => (
                <Badge key={status} variant="outline">
                  {proposalStatusLabel(status)} · {n}
                </Badge>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AiCard({
  ia,
}: {
  ia: {
    balance: number
    packBalance: number
    allowance: number
    usedThisMonth: number
    threads: number
    actions: number
  }
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <Bot className="size-4 text-accent" />
        <CardTitle className="text-sm">{m.admin_ai_title()}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-4">
        <Metric label={m.admin_ai_balance()} value={formatNumber(ia.balance)} />
        <Metric label={m.admin_ai_packs()} value={formatNumber(ia.packBalance)} />
        <Metric label={m.admin_ai_allowance()} value={formatNumber(ia.allowance)} />
        <Metric label={m.admin_ai_used_month()} value={formatNumber(ia.usedThisMonth)} />
        <Metric label={m.admin_ai_threads()} value={formatNumber(ia.threads)} />
        <Metric label={m.admin_ai_actions()} value={formatNumber(ia.actions)} />
      </CardContent>
    </Card>
  )
}

function VeilleCard({ captures }: { captures: number }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between py-4">
        <span className="inline-flex items-center gap-2 text-sm text-fg-muted">
          <Radar className="size-4 text-fg-subtle" />
          {m.admin_veille_captures()}
        </span>
        <span className="assay font-medium text-fg">
          {formatNumber(captures)}
        </span>
      </CardContent>
    </Card>
  )
}

function FeedbacksCard({
  feedbacks,
}: {
  feedbacks: {
    total: number
    items: {
      type: 'bug' | 'idea' | 'other'
      message: string
      status: 'new' | 'in_progress' | 'done'
      createdAt: number
    }[]
  }
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">
          {m.admin_feedbacks_card_title({ n: formatNumber(feedbacks.total) })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {feedbacks.items.length === 0 ? (
          <p className="text-sm text-fg-muted">{m.admin_feedbacks_card_empty()}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {feedbacks.items.map((f, i) => (
              <li key={i} className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={feedbackTypeVariant(f.type)}>
                    {feedbackTypeLabel(f.type)}
                  </Badge>
                  <Badge variant={feedbackStatusVariant(f.status)}>
                    {feedbackStatusLabel(f.status)}
                  </Badge>
                  <span className="text-xs text-fg-subtle">
                    {formatRelative(f.createdAt)}
                  </span>
                </div>
                <p className="line-clamp-2 text-sm text-fg-muted">
                  {f.message}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function AdminActions({
  userId,
  plan,
  isAdminRole,
  suspended,
}: {
  userId: string
  plan: Plan
  isAdminRole: boolean
  suspended: boolean
}) {
  const setUserPlan = useMutation(api.admin.setUserPlan)
  const setUserRole = useMutation(api.admin.setUserRole)
  const setUserSuspended = useMutation(api.admin.setUserSuspended)

  const [pendingPlan, setPendingPlan] = useState<Plan | null>(null)
  const [confirmRole, setConfirmRole] = useState(false)
  const [confirmSuspend, setConfirmSuspend] = useState(false)
  const [busy, setBusy] = useState(false)

  async function run(fn: () => Promise<unknown>, success: string) {
    setBusy(true)
    try {
      await fn()
      toast.success(success)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{m.admin_actions_title()}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-fg-subtle">{m.admin_actions_plan()}</span>
          <Select
            value={plan}
            onValueChange={(value) => setPendingPlan(value as Plan)}
            disabled={busy}
          >
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLAN_OPTIONS.map((p) => (
                <SelectItem key={p} value={p}>
                  {planLabel(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="h-11"
            disabled={busy}
            onClick={() => setConfirmRole(true)}
          >
            {isAdminRole ? (
              <>
                <ShieldOff className="size-4" />
                {m.admin_action_revoke_admin()}
              </>
            ) : (
              <>
                <Shield className="size-4" />
                {m.admin_action_grant_admin()}
              </>
            )}
          </Button>
          <Button
            variant={suspended ? 'outline' : 'destructive'}
            className="h-11"
            disabled={busy}
            onClick={() => setConfirmSuspend(true)}
          >
            {suspended ? m.admin_action_reactivate() : m.admin_action_suspend()}
          </Button>
        </div>
      </CardContent>

      {/* Confirmation changement de palier */}
      <AlertDialog
        open={pendingPlan !== null}
        onOpenChange={(open) => !open && setPendingPlan(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.admin_confirm_plan_title()}</AlertDialogTitle>
            <AlertDialogDescription>
              {m.admin_confirm_plan_desc({
                plan: pendingPlan ? planLabel(pendingPlan) : '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{m.admin_cancel()}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const next = pendingPlan
                setPendingPlan(null)
                if (next)
                  void run(
                    () => setUserPlan({ userId, plan: next }),
                    m.admin_toast_plan_updated({ plan: planLabel(next) }),
                  )
              }}
            >
              {m.admin_confirm()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation rôle admin */}
      <AlertDialog open={confirmRole} onOpenChange={setConfirmRole}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isAdminRole
                ? m.admin_confirm_revoke_admin_title()
                : m.admin_confirm_grant_admin_title()}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isAdminRole
                ? m.admin_confirm_revoke_admin_desc()
                : m.admin_confirm_grant_admin_desc()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{m.admin_cancel()}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmRole(false)
                void run(
                  () =>
                    setUserRole({
                      userId,
                      role: isAdminRole ? null : 'admin',
                    }),
                  isAdminRole
                    ? m.admin_toast_admin_revoked()
                    : m.admin_toast_admin_granted(),
                )
              }}
            >
              {m.admin_confirm()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation suspension */}
      <AlertDialog open={confirmSuspend} onOpenChange={setConfirmSuspend}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {suspended
                ? m.admin_confirm_reactivate_title()
                : m.admin_confirm_suspend_title()}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {suspended
                ? m.admin_confirm_reactivate_desc()
                : m.admin_confirm_suspend_desc()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{m.admin_cancel()}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const next = !suspended
                setConfirmSuspend(false)
                void run(
                  () => setUserSuspended({ userId, suspended: next }),
                  next
                    ? m.admin_toast_suspended()
                    : m.admin_toast_reactivated(),
                )
              }}
            >
              {m.admin_confirm()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-fg-subtle">{label}</span>
      <span className="assay text-sm font-medium text-fg">{value}</span>
    </div>
  )
}

function StatChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-[var(--radius-sm)] bg-surface-2 px-3 py-2">
      <span className="text-fg-subtle">{icon}</span>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-xs text-fg-subtle">{label}</span>
        <span className="assay text-sm font-medium text-fg">{value}</span>
      </div>
    </div>
  )
}

function DetailSkeleton({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-11 rounded-full" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-52" />
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label={m.admin_close_detail()}
          className="h-11 w-11"
        >
          <X className="size-4" />
        </Button>
      </header>
      <div className="flex flex-col gap-4 p-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-[var(--radius-lg)]" />
        ))}
      </div>
    </div>
  )
}
