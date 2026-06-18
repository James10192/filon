import { useState } from 'react'
import { Download, Lock } from 'lucide-react'
import { useUpsell } from '~/lib/billing/use-upsell'
import { exportCsv, type CsvColumn } from '~/lib/export'
import { toast } from '~/components/ui/sonner'
import { Button } from '~/components/ui/button'
import { UpgradeDialog } from './upgrade-dialog'

/**
 * Bouton « Exporter (CSV) » gate au palier Pro+ (l'export est promis a partir de
 * Pro). Reutilise la couche conversion :
 *
 *  - palier qui debloque (`unlocks('pro')`) -> exporte les lignes deja chargees
 *    cote client (aucun appel reseau) et confirme par un toast.
 *  - palier Decouverte (free) -> n'exporte rien, ouvre le dialog d'upgrade
 *    (copie de valeur generique + CTA vers /app/tarifs). Cadenas discret sur le
 *    bouton pour signaler la fonctionnalite premium (anti-slop : pas de rouge).
 *
 * Generique : `rows` + `columns` decrivent quoi exporter ; `base` nomme le
 * fichier (`filon-<base>-AAAA-MM-JJ.csv`). Desactive quand il n'y a rien a
 * exporter (mais reste visible pour faire connaitre la fonctionnalite).
 */
export function ExportButton<T>({
  rows,
  columns,
  base,
  label = 'Exporter (CSV)',
  variant = 'outline',
  size = 'sm',
  className,
}: {
  /** Lignes deja chargees a exporter. `undefined` = chargement en cours. */
  rows: readonly T[] | undefined
  columns: readonly CsvColumn<T>[]
  /** Base du nom de fichier (ex. « opportunites »). */
  base: string
  label?: string
  variant?: React.ComponentProps<typeof Button>['variant']
  size?: React.ComponentProps<typeof Button>['size']
  className?: string
}) {
  const { unlocks, loaded } = useUpsell()
  const canExport = unlocks('pro')
  const [dialogOpen, setDialogOpen] = useState(false)

  // Rien a exporter (liste vide ou en cours de chargement) : on garde le bouton
  // visible mais inerte pour les payeurs ; pour free, le clic vend toujours.
  const nothingToExport = !rows || rows.length === 0

  function handleClick() {
    if (!canExport) {
      setDialogOpen(true)
      return
    }
    if (nothingToExport) return
    try {
      const count = exportCsv(base, rows!, columns)
      toast.success(
        `Export réussi : ${count} ligne${count > 1 ? 's' : ''} au format CSV.`,
      )
    } catch {
      toast.error("L'export a échoué. Réessayez.")
    }
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        // Pour un payeur, desactive si rien a exporter. Pour free, jamais
        // desactive (le clic doit toujours pouvoir ouvrir l'upsell). On evite
        // d'agir avant que le palier soit charge (evite un faux upsell au flash).
        disabled={!loaded || (canExport && nothingToExport)}
        onClick={handleClick}
        aria-label={canExport ? label : `${label} — réservé au palier Pro`}
      >
        {canExport ? (
          <Download className="size-4" />
        ) : (
          <Lock className="size-4" />
        )}
        <span className="hidden sm:inline">{label}</span>
      </Button>

      {/* feature=null -> copie d'upgrade generique (export = avantage Pro). */}
      <UpgradeDialog feature={null} open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}
