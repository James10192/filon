import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  MoreHorizontal,
  Pencil,
  Rocket,
  Send,
  Trash2,
  Undo2,
  XCircle,
} from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Doc } from '../../../convex/_generated/dataModel'
import { m } from '~/lib/paraglide/messages'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
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
import { AskCopilotButton } from '~/components/copilot/ask-copilot-button'
import { STATUS_LABELS, type ProposalStatus } from './proposal-status'
import { downloadProposalPdf } from '~/lib/export/proforma-pdf'
import type { ExportIssuer } from '~/lib/export/export-formatters'
import {
  downloadProposalCsv,
  downloadProposalXlsx,
} from '~/lib/export/proposal-spreadsheet'
import { normalizeProposalKind } from './proposal-kind'

/**
 * Barre d'actions de la page détail : actions de statut contextuelles,
 * conversion en mission, édition, suppression. Confirmations via AlertDialog.
 */
export function ProposalDetailActions({
  proposal,
  proposalDetail,
  onEdit,
}: {
  proposal: Doc<'proposals'>
  proposalDetail: FunctionReturnType<typeof api.proposals.withRecipients>
  onEdit: () => void
}) {
  const navigate = useNavigate()
  const setStatus = useMutation(api.proposals.setStatus)
  const remove = useMutation(api.proposals.remove)
  const convert = useMutation(api.proposals.convertToOpportunity)
  const allocateDocumentNumber = useMutation(
    api.billingProfiles.allocateDocumentNumber,
  )
  const me = useQuery(api.users.me, {})
  const orgs = useQuery(api.organizations.mine, {})
  const billing = useQuery(api.billingProfiles.getMine, {})

  const [busy, setBusy] = useState(false)
  const [exporting, setExporting] = useState<'pdf' | 'xlsx' | 'csv' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmConvert, setConfirmConvert] = useState(false)

  const status = proposal.status as ProposalStatus
  const kind = normalizeProposalKind(proposal.kind)

  async function changeStatus(next: ProposalStatus) {
    if (busy) return
    setBusy(true)
    try {
      await setStatus({ id: proposal._id, status: next })
      toast.success(
        m.prop_toast_status_changed({ label: STATUS_LABELS[next].toLowerCase() }),
      )
    } catch {
      toast.error(m.prop_toast_status_change_error())
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (busy) return
    setBusy(true)
    try {
      await remove({ id: proposal._id })
      toast.success(m.prop_toast_deleted())
      navigate({ to: '/app/propositions', search: { view: 'liste' } })
    } catch {
      toast.error(m.prop_toast_delete_error())
      setBusy(false)
      setConfirmDelete(false)
    }
  }

  async function handleConvert() {
    if (busy) return
    setBusy(true)
    try {
      const opportunityId = await convert({ id: proposal._id })
      toast.success(m.prop_toast_converted())
      setConfirmConvert(false)
      navigate({
        to: '/app/opportunites',
        search: { view: 'liste', id: opportunityId },
      })
    } catch {
      toast.error(m.prop_toast_convert_error())
      setBusy(false)
      setConfirmConvert(false)
    }
  }

  async function handleDownloadPdf() {
    if (exporting) return
    setExporting('pdf')
    try {
      const org = orgs?.[0]
      const documentType =
        kind === 'proforma' ? 'proforma_hors_fne' : 'devis'
      const organizationScope =
        billing?.defaultScope.type === 'organization'
          ? billing.organizations.find(
              (item) =>
                item.organizationId === billing.defaultScope.organizationId,
            )
          : null
      const allocated = organizationScope
        ? await allocateDocumentNumber({
            scopeType: 'organization',
            organizationId: organizationScope.organizationId,
            proposalId: proposal._id,
            documentType,
          })
        : await allocateDocumentNumber({
            scopeType: 'user',
            proposalId: proposal._id,
            documentType,
          })
      await downloadProposalPdf(
        proposalDetail,
        issuerFromBilling({
          profile: organizationScope?.profile ?? billing?.solo,
          fallbackName: org?.name ?? me?.name ?? 'Filon',
          fallbackEmail: me?.email,
          fallbackSubtitle: me?.headline,
        }),
        {
          documentNumber: allocated.documentNumber,
          documentType,
        },
      )
    } catch {
      toast.error("L'export PDF a échoué.")
    } finally {
      setExporting(null)
    }
  }

  async function handleDownloadXlsx() {
    if (exporting) return
    setExporting('xlsx')
    try {
      await downloadProposalXlsx(proposalDetail)
    } catch {
      toast.error("L'export Excel a échoué.")
    } finally {
      setExporting(null)
    }
  }

  function handleDownloadCsv() {
    if (exporting) return
    setExporting('csv')
    try {
      downloadProposalCsv(proposalDetail)
    } catch {
      toast.error("L'export CSV a échoué.")
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <AskCopilotButton
        seed={m.copilot_seed_proposal({ title: proposal.title })}
        variant="icon"
      />
      <StatusActions status={status} busy={busy} onChange={changeStatus} />
      {status === 'accepted' && (
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => setConfirmConvert(true)}
        >
          <Rocket className="size-4" />
          {m.prop_action_convert()}
        </Button>
      )}

      <Button
        variant="outline"
        size="sm"
        disabled={busy || exporting === 'pdf'}
        onClick={() => void handleDownloadPdf()}
      >
        {exporting === 'pdf' ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
        {kind === 'proforma' ? 'Télécharger PDF' : 'Exporter PDF'}
      </Button>

      <Button variant="outline" size="sm" disabled={busy} onClick={onEdit}>
        <Pencil className="size-4" />
        {m.prop_action_edit()}
      </Button>

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={m.prop_more_actions_aria()}
            disabled={busy}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {status !== 'draft' && (
            <DropdownMenuItem onSelect={() => changeStatus('draft')}>
              <Undo2 className="size-4" />
              {m.prop_action_back_to_draft()}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void handleDownloadXlsx()}>
            <FileSpreadsheet className="size-4" />
            Exporter Excel
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleDownloadCsv}>
            <FileText className="size-4" />
            Exporter CSV
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setConfirmDelete(true)}
          >
            <Trash2 className="size-4" />
            {m.prop_action_delete()}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.prop_delete_confirm_title()}</AlertDialogTitle>
            <AlertDialogDescription>
              {m.prop_delete_confirm_description({ title: proposal.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{m.prop_cancel()}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleDelete()
              }}
              disabled={busy}
              className="bg-danger text-white hover:bg-danger/90"
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {m.prop_delete_confirm_action()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmConvert} onOpenChange={setConfirmConvert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.prop_convert_confirm_title()}</AlertDialogTitle>
            <AlertDialogDescription>
              {m.prop_convert_confirm_description()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{m.prop_cancel()}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleConvert()
              }}
              disabled={busy}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {m.prop_convert_confirm_action()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function issuerFromBilling({
  profile,
  fallbackName,
  fallbackEmail,
  fallbackSubtitle,
}: {
  profile:
    | {
        displayName?: string
        email?: string
        logoUrl?: string | null
        phone?: string
        address?: string
        city?: string
        country?: string
        taxId?: string
        rccm?: string
        website?: string
        accentColor?: string
        legalNote?: string
        paymentTerms?: string
        paymentDetails?: string
        signature?: string
      }
    | null
    | undefined
  fallbackName: string
  fallbackEmail?: string
  fallbackSubtitle?: string
}): ExportIssuer {
  return {
    name: profile?.displayName ?? fallbackName,
    ...(profile?.email || fallbackEmail
      ? { email: profile?.email ?? fallbackEmail }
      : {}),
    ...(fallbackSubtitle ? { subtitle: fallbackSubtitle } : {}),
    ...(profile?.logoUrl ? { logoUrl: profile.logoUrl } : {}),
    ...(profile?.phone ? { phone: profile.phone } : {}),
    ...(profile?.address ? { address: profile.address } : {}),
    ...(profile?.city ? { city: profile.city } : {}),
    ...(profile?.country ? { country: profile.country } : {}),
    ...(profile?.taxId ? { taxId: profile.taxId } : {}),
    ...(profile?.rccm ? { rccm: profile.rccm } : {}),
    ...(profile?.website ? { website: profile.website } : {}),
    ...(profile?.accentColor ? { accentColor: profile.accentColor } : {}),
    ...(profile?.legalNote ? { legalNote: profile.legalNote } : {}),
    ...(profile?.paymentTerms ? { paymentTerms: profile.paymentTerms } : {}),
    ...(profile?.paymentDetails
      ? { paymentDetails: profile.paymentDetails }
      : {}),
    ...(profile?.signature ? { signature: profile.signature } : {}),
  }
}

/** Boutons d'action de statut, contextualisés selon le statut courant. */
function StatusActions({
  status,
  busy,
  onChange,
}: {
  status: ProposalStatus
  busy: boolean
  onChange: (next: ProposalStatus) => void
}) {
  if (status === 'draft') {
    return (
      <Button size="sm" disabled={busy} onClick={() => onChange('sent')}>
        <Send className="size-4" />
        {m.prop_action_mark_sent()}
      </Button>
    )
  }
  if (status === 'sent') {
    return (
      <>
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => onChange('accepted')}
        >
          <CheckCircle2 className="size-4" />
          {m.prop_action_accepted()}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => onChange('refused')}
        >
          <XCircle className="size-4" />
          {m.prop_action_refused()}
        </Button>
      </>
    )
  }
  return null
}
