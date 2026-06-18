import { Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { Building2, User, FileText, Loader2, Trash2 } from 'lucide-react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { cn } from '~/lib/utils'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog'
import { Panel } from './panel'

export { Panel } from './panel'
export { FollowupsPanel } from './followups-panel'

type LoadedOpportunity = FunctionReturnType<typeof api.opportunities.get>

export function CompanyContactPanel({
  company,
  contact,
}: {
  company?: LoadedOpportunity['company']
  contact?: LoadedOpportunity['contact']
}) {
  return (
    <Panel title="Entreprise et contact">
      {!company && !contact ? (
        <p className="text-sm text-fg-muted">
          Aucune entreprise ni contact rattaché.
        </p>
      ) : (
        <div className="flex flex-col gap-3 text-sm">
          {company && (
            <div className="flex items-start gap-2.5">
              <Building2 className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
              <div className="min-w-0">
                <p className="font-medium text-fg">{company.name}</p>
                {company.sector && (
                  <p className="text-fg-muted">{company.sector}</p>
                )}
                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="break-all text-accent hover:underline"
                  >
                    {company.website}
                  </a>
                )}
              </div>
            </div>
          )}
          {contact && (
            <div className="flex items-start gap-2.5">
              <User className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
              <div className="min-w-0">
                <p className="font-medium text-fg">{contact.name}</p>
                {contact.role && <p className="text-fg-muted">{contact.role}</p>}
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="break-all text-accent hover:underline"
                  >
                    {contact.email}
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  )
}

export function AttachedDocumentsPanel({
  opportunityId,
}: {
  opportunityId: Id<'opportunities'>
}) {
  const documents = useQuery(api.documents.list, { opportunityId })

  return (
    <Panel
      title="Documents"
      action={
        <Link
          to="/app/documents"
          className="text-sm font-medium text-accent hover:underline"
        >
          Gérer
        </Link>
      }
    >
      {documents === undefined ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : documents.length === 0 ? (
        <p className="text-sm text-fg-muted">
          Aucun document rattaché à cette opportunité.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {documents.map((doc) => (
            <li key={doc._id}>
              <a
                href={doc.url ?? undefined}
                target="_blank"
                rel="noreferrer noopener"
                className={cn(
                  'flex items-center gap-2.5 rounded-[var(--radius)] border border-border px-3 py-2 text-sm transition-colors hover:bg-surface-2',
                  !doc.url && 'pointer-events-none opacity-60',
                )}
              >
                <FileText className="size-4 shrink-0 text-fg-subtle" />
                <span className="truncate font-medium text-fg">{doc.name}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

export function DeleteOpportunityDialog({
  onConfirm,
  pending,
}: {
  onConfirm: () => void
  pending: boolean
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Supprimer"
          title="Supprimer"
          className="size-11 p-0 text-danger hover:bg-surface-2 hover:text-danger sm:size-9"
        >
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer cette opportunité ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est irréversible. La timeline d'activité sera également
            supprimée. Les relances et documents seront détachés.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
            disabled={pending}
            className="bg-danger text-white hover:bg-danger/90"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Supprimer définitivement
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
