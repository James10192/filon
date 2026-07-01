import { formatAmount } from './proposal-status'
import { DetailPanel } from './detail-panel'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'

type Line = {
  label: string
  description?: string
  quantity: number
  unitPrice: number
}

function total(lines: Line[]) {
  return lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)
}

export function ProposalLinesPanel({
  lines,
  currency,
}: {
  lines: Line[]
  currency?: string
}) {
  if (lines.length === 0) return null

  return (
    <DetailPanel title="Lignes commerciales">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Désignation</TableHead>
            <TableHead className="text-right">Qté</TableHead>
            <TableHead className="text-right">Prix</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line, index) => (
            <TableRow key={`${line.label}-${index}`}>
              <TableCell className="max-w-[260px] whitespace-normal">
                <p className="font-medium text-fg">{line.label}</p>
                {line.description && (
                  <p className="mt-1 text-xs text-fg-muted">
                    {line.description}
                  </p>
                )}
              </TableCell>
              <TableCell className="text-right">{line.quantity}</TableCell>
              <TableCell className="text-right">
                {formatAmount(line.unitPrice, currency) ?? ''}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatAmount(line.quantity * line.unitPrice, currency) ?? ''}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3} className="text-right">
              Total
            </TableCell>
            <TableCell className="text-right">
              {formatAmount(total(lines), currency) ?? ''}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </DetailPanel>
  )
}
