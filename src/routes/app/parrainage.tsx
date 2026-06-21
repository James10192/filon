import { useEffect, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Gift,
  Share2,
  UserPlus,
} from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { m } from '~/lib/paraglide/messages'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Skeleton } from '~/components/ui/skeleton'
import { toast } from '~/components/ui/sonner'
import { PageToolbar } from '~/components/app/page-toolbar'

export const Route = createFileRoute('/app/parrainage')({
  component: ParrainagePage,
  head: () => ({ meta: [{ title: m.referral_page_title() }] }),
})

type Overview = {
  code: string | null
  referrals: { email: string | null; status: string; createdAt: number }[]
  signedUp: number
  subscribed: number
  freeMonths: number
  pendingMonths: number
}

function ParrainagePage() {
  const overview = useQuery(api.referrals.myOverview, {}) as Overview | undefined
  const ensureCode = useMutation(api.referrals.ensureMyCode)
  const triedRef = useRef(false)

  // Genere paresseusement le code des le 1er affichage : le lien est pret tout de suite.
  useEffect(() => {
    if (overview && !overview.code && !triedRef.current) {
      triedRef.current = true
      ensureCode({}).catch(() => {
        triedRef.current = false
      })
    }
  }, [overview, ensureCode])

  return (
    <div className="flex flex-col">
      <PageToolbar
        title={m.referral_page_title()}
        subtitle={m.referral_page_subtitle()}
      />
      {overview === undefined ? (
        <LoadingState />
      ) : (
        <Content overview={overview} />
      )}
    </div>
  )
}

function Content({ overview }: { overview: Overview }) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const link = overview.code ? `${origin}/?ref=${overview.code}` : ''

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-6">
      <LinkCard link={link} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          icon={UserPlus}
          label={m.referral_stat_signedup()}
          value={overview.signedUp}
        />
        <Stat
          icon={CheckCircle2}
          label={m.referral_stat_subscribed()}
          value={overview.subscribed}
          accent
        />
        <Stat
          icon={Gift}
          label={m.referral_free_months()}
          value={overview.freeMonths}
          accent
        />
        <Stat
          icon={Clock}
          label={m.referral_pending_months()}
          value={overview.pendingMonths}
          hint={overview.pendingMonths > 0 ? m.referral_pending_hint() : undefined}
        />
      </div>

      <ReferralList referrals={overview.referrals} />
      <HowItWorks />
    </div>
  )
}

function LinkCard({ link }: { link: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    if (!link) return
    void navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      toast.success(m.referral_copied())
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const waHref = link
    ? `https://wa.me/?text=${encodeURIComponent(`${m.referral_share_text()} ${link}`)}`
    : '#'

  return (
    <div className="rounded-[var(--radius-lg)] border border-accent/30 bg-surface p-5 shadow-[var(--shadow-card)] md:p-6">
      <div className="flex items-center gap-2 text-sm font-medium text-fg">
        <Gift className="size-4 text-accent" />
        {m.referral_your_link()}
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="min-w-0 flex-1 truncate rounded-[var(--radius)] border border-border bg-surface-2 px-3 py-2.5 text-sm text-fg-muted">
          {link || <Skeleton className="h-5 w-48" />}
        </code>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" onClick={copy} disabled={!link}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {m.referral_copy()}
          </Button>
          <Button asChild disabled={!link}>
            <a href={waHref} target="_blank" rel="noopener noreferrer">
              <Share2 className="size-4" />
              {m.referral_share_whatsapp()}
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
  hint,
}: {
  icon: typeof Gift
  label: string
  value: number
  accent?: boolean
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-[var(--shadow-card)]">
      <Icon className={accent ? 'size-4 text-accent' : 'size-4 text-fg-subtle'} />
      <span className="text-2xl font-semibold tabular-nums text-fg">{value}</span>
      <span className="text-xs text-fg-muted">{label}</span>
      {hint && <span className="text-[11px] text-fg-subtle">{hint}</span>}
    </div>
  )
}

const STATUS_BADGE: Record<string, { label: () => string; cls: string }> = {
  signed_up: { label: m.referral_status_signed_up, cls: '' },
  subscribed: {
    label: m.referral_status_subscribed,
    cls: 'border-accent/40 text-accent',
  },
  churned: { label: m.referral_status_churned, cls: 'text-fg-subtle' },
}

function ReferralList({
  referrals,
}: {
  referrals: Overview['referrals']
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)]">
      <h2 className="border-b border-border px-5 py-3.5 text-sm font-semibold text-fg">
        {m.referral_list_title()}
      </h2>
      {referrals.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-fg-muted">
          {m.referral_list_empty()}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {referrals.map((r, i) => {
            const badge = STATUS_BADGE[r.status] ?? STATUS_BADGE.signed_up!
            return (
              <li
                key={i}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <span className="truncate text-sm text-fg">
                  {r.email ?? m.referral_anonymous()}
                </span>
                <Badge variant="outline" className={badge.cls}>
                  {badge.label()}
                </Badge>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function HowItWorks() {
  const steps = [m.referral_how_1(), m.referral_how_2(), m.referral_how_3()]
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface-2 p-5 md:p-6">
      <h2 className="text-sm font-semibold text-fg">{m.referral_how_title()}</h2>
      <ol className="mt-3 flex flex-col gap-2.5">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-fg-muted">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-white">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-6">
      <Skeleton className="h-28 w-full rounded-[var(--radius-lg)]" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-[var(--radius-lg)]" />
        ))}
      </div>
      <Skeleton className="h-40 w-full rounded-[var(--radius-lg)]" />
    </div>
  )
}
