import type { ReactNode } from 'react'
import { m } from '~/lib/paraglide/messages'

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
      title: m.app_dialog_cancel_title(),
      description: (
        <>
          {m.app_dialog_cancel_desc_before()}{deadline(renewsAtLabel)}
          {m.app_dialog_cancel_desc_after()}
        </>
      ),
      actionLabel: m.app_sub_cancel_renewal(),
      success: m.app_dialog_cancel_success(),
    }
  }
  return {
    title: m.app_dialog_downgrade_title(),
    description: (
      <>
        {m.app_dialog_downgrade_desc_before()}{deadline(renewsAtLabel)}
        {m.app_dialog_downgrade_desc_after()}
      </>
    ),
    actionLabel: m.app_dialog_downgrade_action(),
    success: m.app_dialog_downgrade_success(),
  }
}
