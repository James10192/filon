import { useEffect, useState } from 'react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog'

export type ClosingOutcome = 'won' | 'lost'
export type ClosingPayload = {
  outcome: ClosingOutcome
  summary: string
  nextAction: string
  valueAmount?: number
  lossReason?: string
}

export function ClosingDialog({ open, onOpenChange, onClosed }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClosed: (payload: ClosingPayload) => Promise<void>
}) {
  const [outcome, setOutcome] = useState<ClosingOutcome>('won')
  const [amount, setAmount] = useState('')
  const [summary, setSummary] = useState('')
  const [reason, setReason] = useState('')
  const [nextAction, setNextAction] = useState('Planifier le suivi client')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setOutcome('won')
    setAmount('')
    setSummary('')
    setReason('')
    setNextAction('Planifier le suivi client')
    setError('')
  }, [open])

  async function submit() {
    const numericAmount = Number(amount.replace(/[^0-9]/g, ''))
    if (!summary.trim() || !nextAction.trim()) {
      setError('Le résumé et la prochaine action sont obligatoires.')
      return
    }
    if (outcome === 'won' && !numericAmount) {
      setError('Le montant signé est obligatoire.')
      return
    }
    if (outcome === 'lost' && !reason.trim()) {
      setError('Le motif de perte est obligatoire.')
      return
    }
    const payload: ClosingPayload = { outcome, summary: summary.trim(), nextAction: nextAction.trim() }
    if (outcome === 'won') payload.valueAmount = numericAmount
    if (outcome === 'lost') payload.lossReason = reason.trim()
    setSaving(true)
    try {
      await onClosed(payload)
      onOpenChange(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Le closing n’a pas pu être enregistré.')
    } finally {
      setSaving(false)
    }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Clore le deal</DialogTitle><DialogDescription>Consignez la décision et créez immédiatement la prochaine action.</DialogDescription></DialogHeader><div className="grid grid-cols-2 rounded-[var(--radius-lg)] bg-surface-2 p-1"><Button variant={outcome === 'won' ? 'default' : 'ghost'} onClick={() => setOutcome('won')}>Closing réussi</Button><Button variant={outcome === 'lost' ? 'default' : 'ghost'} onClick={() => setOutcome('lost')}>Deal perdu</Button></div><div className="space-y-4"><div><label htmlFor="closing-summary" className="text-sm font-medium text-fg">Résumé de la décision</label><Textarea id="closing-summary" value={summary} onChange={(event) => setSummary(event.target.value)} className="mt-2" placeholder="Décision, périmètre et engagement obtenu" /></div>{outcome === 'won' ? <div><label htmlFor="closing-amount" className="text-sm font-medium text-fg">Montant signé</label><Input id="closing-amount" inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Ex. 1 500 000 XOF" className="mt-2" /></div> : <div><label htmlFor="closing-reason" className="text-sm font-medium text-fg">Motif de perte</label><Input id="closing-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ex. Budget reporté" className="mt-2" /></div>}<div><label htmlFor="closing-next" className="text-sm font-medium text-fg">Prochaine action</label><Input id="closing-next" value={nextAction} onChange={(event) => setNextAction(event.target.value)} className="mt-2" /></div></div>{error && <p role="alert" className="text-sm text-danger">{error}</p>}<DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button><Button onClick={submit} disabled={saving}>{saving ? 'Enregistrement…' : 'Confirmer le closing'}</Button></DialogFooter></DialogContent></Dialog>
}
