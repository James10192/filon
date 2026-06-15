import { Check, Minus } from 'lucide-react'
import { COMPARE_ROWS, type CompareRow } from './plan-catalogue'

/**
 * Tableau comparatif des paliers payants vs gratuit. Booléens rendus par une
 * icône (check accent / tiret discret), valeurs textuelles en clair. Défile
 * horizontalement sur mobile sans casser la mise en page.
 */
export function PlanComparison() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)]">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-fg">
          Comparatif des paliers
        </h2>
        <p className="mt-0.5 text-sm text-fg-muted">
          Ce que débloque chaque palier, en un coup d'oeil.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-5 py-3 font-medium text-fg-muted">
                Fonctionnalité
              </th>
              <th className="px-4 py-3 text-center font-medium text-fg-muted">
                Découverte
              </th>
              <th className="px-4 py-3 text-center font-medium text-accent">
                Pro
              </th>
              <th className="px-4 py-3 text-center font-medium text-fg-muted">
                Pro+ IA
              </th>
              <th className="px-4 py-3 text-center font-medium text-fg-muted">
                Copilot
              </th>
            </tr>
          </thead>
          <tbody>
            {COMPARE_ROWS.map((row) => (
              <tr
                key={row.label}
                className="border-b border-border/60 last:border-0"
              >
                <td className="px-5 py-3 text-fg">{row.label}</td>
                <Cell value={row.free} />
                <Cell value={row.pro} />
                <Cell value={row.pro_ai} />
                <Cell value={row.copilot} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Cell({ value }: { value: CompareRow['free'] }) {
  if (typeof value === 'boolean') {
    return (
      <td className="px-4 py-3 text-center">
        {value ? (
          <Check className="mx-auto size-4 text-accent" />
        ) : (
          <Minus className="mx-auto size-4 text-fg-subtle" />
        )}
      </td>
    )
  }
  return (
    <td className="assay px-4 py-3 text-center text-fg-muted">{value}</td>
  )
}
