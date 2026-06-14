import type { ReactNode } from 'react'

/**
 * Textes des boîtes de confirmation du cycle de vie (annulation / downgrade).
 * Sortis du composant pour le garder court : ici uniquement le contenu rédigé,
 * avec l'échéance injectée en `.assay`.
 */
export type LifecycleDialog = 'cancel' | 'downgrade'

function deadline(renewsAtLabel: string | null): ReactNode {
  if (!renewsAtLabel) return null
  return (
    <>
      {' '}
      (<span className="assay">{renewsAtLabel}</span>)
    </>
  )
}

export function dialogCopy(
  kind: LifecycleDialog,
  renewsAtLabel: string | null,
): { title: string; description: ReactNode; actionLabel: string; success: string } {
  if (kind === 'cancel') {
    return {
      title: 'Annuler le renouvellement ?',
      description: (
        <>
          Votre accès Pro reste actif jusqu’à l’échéance{deadline(renewsAtLabel)},
          puis votre compte repassera en Découverte. Aucune donnée n’est
          supprimée.
        </>
      ),
      actionLabel: 'Annuler le renouvellement',
      success: 'Renouvellement annulé. Accès maintenu jusqu’à l’échéance.',
    }
  }
  return {
    title: 'Passer à Pro à l’échéance ?',
    description: (
      <>
        Vous conservez Pro+ IA jusqu’à l’échéance{deadline(renewsAtLabel)}, puis
        votre palier deviendra Pro.
      </>
    ),
    actionLabel: 'Programmer le passage à Pro',
    success: 'Passage à Pro programmé pour l’échéance.',
  }
}
