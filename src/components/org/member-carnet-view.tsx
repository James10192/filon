import { Component, type ReactNode } from 'react'
import { useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import {
  ArrowLeft,
  Building2,
  Users,
  BellRing,
  Briefcase,
  EyeOff,
} from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { m } from '~/lib/paraglide/messages'
import { cn } from '~/lib/utils'
import { forbiddenMessage } from '~/lib/billing/plan'
import { formatDate } from '~/components/relances/format'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { StageChip } from '~/components/opportunities/chips'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

/**
 * Vue lecture seule du carnet d'un membre, ouverte par un manager. Trois sections
 * de carnet (contacts, entreprises, relances) chacune sous une frontière d'erreur
 * qui capte le `FORBIDDEN` levé si le membre désactive le partage en cours de
 * route, sans casser la vue. Le pipeline (déjà visible manager via team.pipeline)
 * n'est PAS gardé par ce drapeau. Aucun export / copie : consultation seule.
 */
export function MemberCarnetView({
  organizationId,
  targetUserId,
  memberName,
  memberImage,
  onBack,
}: {
  organizationId: Id<'organizations'>
  targetUserId: string
  memberName: string
  memberImage: string | null
  onBack: () => void
}) {
  const logView = useMutation(api.carnet.logCarnetView)

  // Journalisation fire-and-forget à l'ouverture (erreurs ignorées).
  useEffect(() => {
    void logView({ organizationId, targetUserId }).catch(() => {})
  }, [logView, organizationId, targetUserId])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="-ml-2 h-11 shrink-0 text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="size-4" />
          {m.org_carnet_back()}
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Avatar className="size-11">
          {memberImage && <AvatarImage src={memberImage} alt="" />}
          <AvatarFallback>{initials(memberName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-fg">
            {memberName}
          </h2>
          <p className="truncate text-sm text-fg-muted">
            {m.org_carnet_subtitle({ name: memberName })}
          </p>
        </div>
      </div>

      <PipelineSection
        organizationId={organizationId}
        targetUserId={targetUserId}
      />

      <CarnetErrorBoundary resetKey={targetUserId}>
        <ContactsSection
          organizationId={organizationId}
          targetUserId={targetUserId}
        />
      </CarnetErrorBoundary>

      <CarnetErrorBoundary resetKey={targetUserId}>
        <CompaniesSection
          organizationId={organizationId}
          targetUserId={targetUserId}
        />
      </CarnetErrorBoundary>

      <CarnetErrorBoundary resetKey={targetUserId}>
        <FollowupsSection
          organizationId={organizationId}
          targetUserId={targetUserId}
        />
      </CarnetErrorBoundary>
    </div>
  )
}

/** En-tête d'une section du carnet (icône + titre). */
function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: typeof Users
  title: string
}) {
  return (
    <h3 className="flex items-center gap-2 text-base font-semibold text-fg">
      <Icon className="size-4 text-fg-subtle" />
      {title}
    </h3>
  )
}

function SectionSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-[var(--radius-lg)]" />
      ))}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-fg-muted">
      {text}
    </div>
  )
}

/**
 * Pipeline du membre. Réutilise `team.pipeline` (déjà visible manager) filtré sur
 * le `targetUserId`. Compact, lecture seule. Non gardé par le partage de carnet.
 */
function PipelineSection({
  organizationId,
  targetUserId,
}: {
  organizationId: Id<'organizations'>
  targetUserId: string
}) {
  const data = useQuery(api.team.pipeline, { organizationId })

  return (
    <section className="flex flex-col gap-3">
      <SectionHeader icon={Briefcase} title={m.org_carnet_pipeline_title()} />
      {data === undefined ? (
        <SectionSkeleton />
      ) : (
        (() => {
          const opps = data.opportunities.filter(
            (o) => o.ownerUserId === targetUserId,
          )
          if (opps.length === 0) {
            return <EmptyState text={m.org_carnet_pipeline_empty()} />
          }
          return (
            <ul className="flex flex-col gap-1.5">
              {opps.map((o) => {
                const targetName = o.companyName ?? o.contactName
                return (
                  <li
                    key={o._id}
                    className="flex min-h-11 items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-border bg-surface px-3.5 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-fg">
                        {o.title}
                      </p>
                      {targetName && (
                        <p className="truncate text-xs text-fg-subtle">
                          {targetName}
                        </p>
                      )}
                    </div>
                    <StageChip stage={o.stage} compact className="shrink-0" />
                  </li>
                )
              })}
            </ul>
          )
        })()
      )}
    </section>
  )
}

function ContactsSection({
  organizationId,
  targetUserId,
}: {
  organizationId: Id<'organizations'>
  targetUserId: string
}) {
  const contacts = useQuery(api.carnet.listContactsForMember, {
    organizationId,
    targetUserId,
  })

  return (
    <section className="flex flex-col gap-3">
      <SectionHeader icon={Users} title={m.org_carnet_contacts_title()} />
      {contacts === undefined ? (
        <SectionSkeleton />
      ) : contacts.length === 0 ? (
        <EmptyState text={m.org_carnet_contacts_empty()} />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)]">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-3">{m.org_carnet_col_name()}</TableHead>
                <TableHead className="hidden px-3 sm:table-cell">
                  {m.org_carnet_col_company()}
                </TableHead>
                <TableHead className="hidden px-3 md:table-cell">
                  {m.org_carnet_col_role()}
                </TableHead>
                <TableHead className="px-3">{m.org_carnet_col_email()}</TableHead>
                <TableHead className="hidden px-3 md:table-cell">
                  {m.org_carnet_col_phone()}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((c) => (
                <TableRow key={c._id} className="hover:bg-surface-2">
                  <TableCell className="px-3 py-2.5 font-medium text-fg">
                    {c.name}
                  </TableCell>
                  <TableCell className="hidden px-3 py-2.5 text-fg-muted sm:table-cell">
                    {('companyName' in c ? c.companyName : undefined) ?? '—'}
                  </TableCell>
                  <TableCell className="hidden px-3 py-2.5 text-fg-muted md:table-cell">
                    {c.role ?? '—'}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-fg-muted">
                    {c.email ?? '—'}
                  </TableCell>
                  <TableCell className="hidden px-3 py-2.5 tabular-nums text-fg-muted md:table-cell">
                    {c.phone ?? '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  )
}

function CompaniesSection({
  organizationId,
  targetUserId,
}: {
  organizationId: Id<'organizations'>
  targetUserId: string
}) {
  const companies = useQuery(api.carnet.listCompaniesForMember, {
    organizationId,
    targetUserId,
  })

  return (
    <section className="flex flex-col gap-3">
      <SectionHeader icon={Building2} title={m.org_carnet_companies_title()} />
      {companies === undefined ? (
        <SectionSkeleton />
      ) : companies.length === 0 ? (
        <EmptyState text={m.org_carnet_companies_empty()} />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {companies.map((co) => {
            const meta = [co.sector, co.location].filter(Boolean).join(' · ')
            return (
              <li
                key={co._id}
                className="flex min-h-11 flex-col justify-center rounded-[var(--radius-lg)] border border-border bg-surface px-3.5 py-2.5"
              >
                <span className="truncate text-sm font-medium text-fg">
                  {co.name}
                </span>
                {meta && (
                  <span className="truncate text-xs text-fg-subtle">{meta}</span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function FollowupsSection({
  organizationId,
  targetUserId,
}: {
  organizationId: Id<'organizations'>
  targetUserId: string
}) {
  const followups = useQuery(api.carnet.listFollowupsForMember, {
    organizationId,
    targetUserId,
  })

  return (
    <section className="flex flex-col gap-3">
      <SectionHeader icon={BellRing} title={m.org_carnet_followups_title()} />
      {followups === undefined ? (
        <SectionSkeleton />
      ) : followups.length === 0 ? (
        <EmptyState text={m.org_carnet_followups_empty()} />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {followups.map((f) => (
            <li
              key={f._id}
              className="flex min-h-11 items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-surface px-3.5 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-fg">{f.label}</p>
                {f.opportunityTitle && (
                  <p className="truncate text-xs text-fg-subtle">
                    {f.opportunityTitle}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-xs tabular-nums text-fg-muted">
                {formatDate(f.dueDate)}
              </span>
              <span
                className={cn(
                  'inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-xs font-medium',
                  f.done
                    ? 'bg-success-soft text-success'
                    : 'bg-surface-2 text-fg-muted',
                )}
              >
                {f.done
                  ? m.org_carnet_followup_done()
                  : m.org_carnet_followup_pending()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/**
 * Frontière d'erreur d'une section de carnet. Capte le `FORBIDDEN` levé quand le
 * membre désactive le partage en cours de consultation : affiche le message
 * dédié plutôt que de casser la vue. `resetKey` (targetUserId) force un reset au
 * changement de membre. Si l'erreur n'est PAS un `FORBIDDEN` connu, on la
 * remonte (vraie erreur), captée par une frontière supérieure.
 */
class CarnetErrorBoundary extends Component<
  { children: ReactNode; resetKey: string },
  { forbidden: boolean }
> {
  state = { forbidden: false }

  static getDerivedStateFromError(error: unknown): { forbidden: boolean } {
    if (forbiddenMessage(error) !== null) return { forbidden: true }
    throw error
  }

  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.forbidden) {
      this.setState({ forbidden: false })
    }
  }

  render() {
    if (this.state.forbidden) {
      return (
        <div className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-border bg-surface px-4 py-10 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-surface-2 text-fg-subtle">
            <EyeOff className="size-5" />
          </span>
          <p className="max-w-xs text-sm text-fg-muted">
            {m.org_carnet_forbidden()}
          </p>
        </div>
      )
    }
    return this.props.children
  }
}
