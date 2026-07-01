import { Plus, Trash2 } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { formatAmount } from './proposal-status'

export type ProposalLineInput = {
  label: string
  description?: string
  quantity: number
  unitPrice: number
}

function blankLine(): ProposalLineInput {
  return { label: '', quantity: 1, unitPrice: 0 }
}

export function proposalLinesTotal(lines: ProposalLineInput[]): number {
  return lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)
}

export function ProposalLinesEditor({
  lines,
  currency,
  onChange,
}: {
  lines: ProposalLineInput[]
  currency: string
  onChange: (lines: ProposalLineInput[]) => void
}) {
  const total = proposalLinesTotal(lines)

  function patchLine(index: number, patch: Partial<ProposalLineInput>) {
    onChange(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)))
  }

  function removeLine(index: number) {
    const next = lines.filter((_, i) => i !== index)
    onChange(next.length > 0 ? next : [blankLine()])
  }

  return (
    <section className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-surface-2 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label>Lignes commerciales</Label>
          <p className="text-xs text-fg-muted">
            Utilisées pour le PDF, Excel et le total de la proforma.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...lines, blankLine()])}
        >
          <Plus className="size-4" />
          Ligne
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {lines.map((line, index) => (
          <div
            key={index}
            className="grid gap-2 rounded-[var(--radius-sm)] border border-border bg-bg p-3"
          >
            <div className="grid gap-2 sm:grid-cols-[1fr_84px_120px_auto]">
              <Input
                value={line.label}
                onChange={(event) =>
                  patchLine(index, { label: event.target.value })
                }
                placeholder="Désignation"
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                value={line.quantity}
                onChange={(event) =>
                  patchLine(index, { quantity: Number(event.target.value) })
                }
                aria-label="Quantité"
              />
              <Input
                type="number"
                min="0"
                step="1"
                value={line.unitPrice}
                onChange={(event) =>
                  patchLine(index, { unitPrice: Number(event.target.value) })
                }
                aria-label="Prix unitaire"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeLine(index)}
                aria-label="Supprimer la ligne"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <Textarea
              value={line.description ?? ''}
              onChange={(event) =>
                patchLine(index, { description: event.target.value })
              }
              placeholder="Description courte, optionnelle"
              className="min-h-16"
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end border-t border-border pt-3 text-sm">
        <span className="font-medium text-fg">
          Total : {formatAmount(total, currency) ?? '0'}
        </span>
      </div>
    </section>
  )
}
